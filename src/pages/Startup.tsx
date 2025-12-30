import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useLoginPopup } from "@/contexts/LoginPopupContext";
import { useSession } from "@/contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import AivedhaAPI from "@/lib/api";
import { logger } from "@/lib/logger";
import { isValidEmail, isValidUrl } from "@/utils/validation";
import { getErrorMessage } from "@/utils/type-guards";
import { CLIPBOARD_FEEDBACK_DURATION_MS } from "@/constants/subscription";
import { APP_CONFIG } from "@/config";
import {
    Rocket,
    Shield,
    Sparkles,
    CheckCircle2,
    Gift,
    Zap,
    Star,
    ArrowRight,
    Building2,
    Globe,
    Mail,
    User,
    Briefcase,
    Target,
    Lock,
    TrendingUp,
    Award,
    Copy,
    ExternalLink,
    Check,
    ChevronRight,
    Cpu,
    Database,
    Eye,
    FileCheck,
    Fingerprint,
    HeartHandshake,
    Layers,
    LineChart,
    MousePointerClick,
    Network,
    RefreshCcw,
    ScanLine,
    ServerCog,
    ShieldCheck,
    Timer,
    Users,
    Wand2,
    LucideIcon
} from "lucide-react";

// ============================================================================
// SEO METADATA
// ============================================================================
const STARTUP_SEO = {
    title: "Startup Security Program | AiVedha Guard - 50% OFF for 1 Year",
    description: "Exclusive security audit program for startups. Get 3 free credits + 50% discount for 1 year. Startup TN, MSME, SIDBI approved. Protect your startup with AI-powered security.",
    keywords: "startup security, startup offer, startup TN approved, MSME security audit, startup discount, startup scheme, free security credits, startup protection, AI security for startups"
};

// ============================================================================
// ANIMATED SLOGANS
// ============================================================================
const SLOGANS = [
    { text: "Build Bold. Secure Smart.", icon: Rocket, gradient: "from-violet-500 via-purple-500 to-fuchsia-500" },
    { text: "Your Vision, Our Shield.", icon: Shield, gradient: "from-cyan-500 via-blue-500 to-indigo-500" },
    { text: "Trust is Your Superpower.", icon: Star, gradient: "from-amber-500 via-orange-500 to-red-500" },
    { text: "Security Fuels Growth.", icon: TrendingUp, gradient: "from-emerald-500 via-green-500 to-teal-500" },
    { text: "Protect What You're Building.", icon: Lock, gradient: "from-rose-500 via-pink-500 to-purple-500" }
];

// ============================================================================
// BENEFITS CONFIGURATION
// ============================================================================
const BENEFITS = [
    {
        icon: Gift,
        title: "3 Free Security Credits",
        desc: "Start auditing immediately",
        gradient: "from-emerald-400 to-green-500",
        bgGlow: "emerald"
    },
    {
        icon: Zap,
        title: "50% OFF for 1 Year",
        desc: "On all plan purchases",
        gradient: "from-amber-400 to-orange-500",
        bgGlow: "amber"
    },
    {
        icon: Shield,
        title: "21 Security Modules",
        desc: "Enterprise-grade protection",
        gradient: "from-violet-400 to-purple-500",
        bgGlow: "violet"
    },
    {
        icon: Sparkles,
        title: "AI-Powered Fixes",
        desc: "Copy-paste remediation code",
        gradient: "from-cyan-400 to-blue-500",
        bgGlow: "cyan"
    },
    {
        icon: Award,
        title: "Security Certificate",
        desc: "Build stakeholder trust",
        gradient: "from-pink-400 to-rose-500",
        bgGlow: "pink"
    },
    {
        icon: Globe,
        title: "Global Coverage",
        desc: "195+ countries supported",
        gradient: "from-indigo-400 to-blue-500",
        bgGlow: "indigo"
    }
];

// ============================================================================
// SECURITY FEATURES
// ============================================================================
const SECURITY_FEATURES = [
    { icon: ScanLine, text: "Vulnerability Scanning" },
    { icon: Fingerprint, text: "Authentication Audit" },
    { icon: Database, text: "Data Protection" },
    { icon: Network, text: "Network Security" },
    { icon: ServerCog, text: "Infrastructure Review" },
    { icon: FileCheck, text: "Compliance Check" }
];

// ============================================================================
// TRUST BADGES
// ============================================================================
const TRUST_BADGES = [
    {
        name: "Google Cloud",
        logo: "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
        height: "h-7"
    },
    {
        name: "AWS Startups",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
        height: "h-9"
    },
    {
        name: "NVIDIA Inception",
        logo: "https://www.citypng.com/public/uploads/preview/nvidia-inception-program-logo-hd-png-7017516947058121y5al6m8zm.png",
        height: "h-9"
    },
    {
        name: "Startup India",
        logo: "https://www.uxdt.nic.in/wp-content/uploads/2020/06/Startup-India.jpg",
        height: "h-9"
    },
    {
        name: "MSME",
        logo: "https://upload.wikimedia.org/wikipedia/commons/0/09/MSME_logo_%28colour%29.svg",
        height: "h-9"
    },
    {
        name: "Nessum Alliance",
        logo: "https://nessum.org/dcms_media/other/footer-logo.svg",
        height: "h-7",
        invert: true
    }
];

// ============================================================================
// STATISTICS
// ============================================================================
const STATISTICS = [
    { value: "500+", label: "Startups Protected", icon: Users },
    { value: "99.9%", label: "Threat Detection", icon: Eye },
    { value: "<2min", label: "Avg. Scan Time", icon: Timer },
    { value: "24/7", label: "Monitoring", icon: RefreshCcw }
];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface StartupFormData {
    email: string;
    founderName: string;
    startupName: string;
    website: string;
    pitch: string;
    stage: string;
    acceptTerms: boolean;
}

// ============================================================================
// FLOATING PARTICLE COMPONENT
// ============================================================================
const FloatingParticle = ({ delay, duration, x, y, size }: {
    delay: number;
    duration: number;
    x: string;
    y: string;
    size: number;
}) => (
    <motion.div
        className="absolute rounded-full"
        style={{
            left: x,
            top: y,
            width: size,
            height: size,
            background: `radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(6, 182, 212, 0.4) 50%, transparent 70%)`
        }}
        animate={{
            y: [0, -80, 0],
            x: [0, 20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1]
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    />
);

// ============================================================================
// ANIMATED GRADIENT ORB COMPONENT
// ============================================================================
const GradientOrb = ({
    className,
    colors,
    animateX,
    animateY,
    duration
}: {
    className: string;
    colors: string;
    animateX: number[];
    animateY: number[];
    duration: number;
}) => (
    <motion.div
        className={`absolute rounded-full blur-3xl ${className}`}
        style={{ background: colors }}
        animate={{
            x: animateX,
            y: animateY,
            scale: [1, 1.15, 1]
        }}
        transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    />
);

// ============================================================================
// BENEFIT CARD COMPONENT
// ============================================================================
const BenefitCard = ({
    benefit,
    index
}: {
    benefit: typeof BENEFITS[0];
    index: number;
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                delay: 0.1 * index,
                type: "spring",
                stiffness: 100
            }}
            whileHover={{
                scale: 1.05,
                y: -5
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="relative group"
        >
            {/* Glow effect on hover */}
            <motion.div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${benefit.gradient} opacity-0 blur-xl transition-opacity duration-500`}
                animate={{ opacity: isHovered ? 0.4 : 0 }}
            />

            <div className="relative p-5 rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 h-full">
                {/* Icon container with gradient background */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} p-0.5 mb-4`}>
                    <div className="w-full h-full rounded-xl bg-slate-900/90 flex items-center justify-center">
                        <benefit.icon className="w-7 h-7 text-white" />
                    </div>
                </div>

                <h4 className="font-bold text-white text-base mb-1.5 group-hover:text-cyan-300 transition-colors">
                    {benefit.title}
                </h4>
                <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    {benefit.desc}
                </p>

                {/* Decorative corner accent */}
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${benefit.gradient} opacity-10 rounded-tr-2xl rounded-bl-full`} />
            </div>
        </motion.div>
    );
};

// ============================================================================
// STATISTIC CARD COMPONENT
// ============================================================================
const StatCard = ({ stat, index }: { stat: typeof STATISTICS[0]; index: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 + index * 0.1 }}
        className="text-center group"
    >
        <div className="relative inline-flex items-center justify-center w-12 h-12 mb-2 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 group-hover:border-cyan-400/50 transition-colors">
            <stat.icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {stat.value}
        </div>
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            {stat.label}
        </div>
    </motion.div>
);

// ============================================================================
// ANIMATED INPUT COMPONENT
// ============================================================================
const AnimatedInput = ({
    id,
    label,
    icon: Icon,
    iconColor,
    borderColor,
    focusBorderColor,
    value,
    onChange,
    type = "text",
    required = false,
    tabIndex,
    placeholder,
    inputRef
}: {
    id: string;
    label: string;
    icon: LucideIcon;
    iconColor: string;
    borderColor: string;
    focusBorderColor: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
    tabIndex?: number;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: tabIndex ? tabIndex * 0.05 : 0 }}
        >
            <Label
                htmlFor={id}
                className="text-slate-200 flex items-center gap-2 text-sm font-medium"
            >
                <motion.div
                    animate={{
                        scale: isFocused ? 1.1 : 1,
                        rotate: isFocused ? 5 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </motion.div>
                {label}
                {required && <span className="text-rose-400">*</span>}
            </Label>
            <div className="relative">
                <motion.div
                    className={`absolute inset-0 rounded-lg bg-gradient-to-r ${focusBorderColor} opacity-0 blur-sm`}
                    animate={{ opacity: isFocused ? 0.5 : 0 }}
                    transition={{ duration: 0.2 }}
                />
                <Input
                    id={id}
                    ref={inputRef}
                    type={type}
                    tabIndex={tabIndex}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className={`relative bg-slate-800/70 border-2 ${borderColor} text-white placeholder:text-slate-500 h-12 rounded-lg transition-all duration-300 focus:${focusBorderColor.split(' ')[0].replace('from-', 'border-')}`}
                    required={required}
                />
            </div>
        </motion.div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const Startup = () => {
    const { toast } = useToast();
    const { showLoginPopup } = useLoginPopup();
    const { isAuthenticated } = useSession();
    const navigate = useNavigate();
    const emailInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState<StartupFormData>({
        email: "",
        founderName: "",
        startupName: "",
        website: "",
        pitch: "",
        stage: "idea",
        acceptTerms: true
    });

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCoupon, setShowCoupon] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [currentSlogan, setCurrentSlogan] = useState(0);
    const [pendingStartupData, setPendingStartupData] = useState<StartupFormData | null>(null);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);

    // Mouse position for interactive effects
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    // ============================================================================
    // EFFECTS
    // ============================================================================

    // Set page title and SEO on mount
    useEffect(() => {
        document.title = STARTUP_SEO.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', STARTUP_SEO.description);
        }

        // Auto-focus email input after a brief delay
        const timer = setTimeout(() => {
            emailInputRef.current?.focus();
        }, 500);

        return () => {
            clearTimeout(timer);
            document.title = "AiVedha Guard - AI-Powered Security Audit Platform";
        };
    }, []);

    // Rotate slogans
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlogan((prev) => (prev + 1) % SLOGANS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Handle mouse movement for interactive background
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Complete registration after authentication
    useEffect(() => {
        if (isAuthenticated && pendingStartupData) {
            completeStartupRegistration(pendingStartupData);
            setPendingStartupData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, pendingStartupData]);

    // ============================================================================
    // HANDLERS
    // ============================================================================

    const handleChange = useCallback((field: keyof StartupFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const generateCouponCode = (email: string): string => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const emailHash = email.split("@")[0].slice(0, 4).toUpperCase();
        return `STARTUP50-${emailHash}-${timestamp}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.email?.trim()) {
            toast({
                title: "Email Required",
                description: "Please enter your email address.",
                variant: "destructive"
            });
            emailInputRef.current?.focus();
            return;
        }

        if (!isValidEmail(formData.email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address.",
                variant: "destructive"
            });
            emailInputRef.current?.focus();
            return;
        }

        if (!formData.founderName?.trim() || formData.founderName.trim().length < 2) {
            toast({
                title: "Founder Name Required",
                description: "Please enter your full name (at least 2 characters).",
                variant: "destructive"
            });
            return;
        }

        if (!formData.startupName?.trim() || formData.startupName.trim().length < 2) {
            toast({
                title: "Startup Name Required",
                description: "Please enter your startup name (at least 2 characters).",
                variant: "destructive"
            });
            return;
        }

        if (!isValidUrl(formData.website)) {
            toast({
                title: "Invalid Website URL",
                description: "Please enter a valid website URL (e.g., example.com).",
                variant: "destructive"
            });
            return;
        }

        if (!formData.acceptTerms) {
            toast({
                title: "Terms Required",
                description: "Please accept the terms and conditions to continue.",
                variant: "destructive"
            });
            return;
        }

        setPendingStartupData(formData);

        showLoginPopup({
            onSuccess: async () => {
                await completeStartupRegistration(formData);
            },
            returnTo: "/startup"
        });
    };

    const completeStartupRegistration = async (data: StartupFormData) => {
        setIsSubmitting(true);

        try {
            const newCouponCode = generateCouponCode(data.email);
            setCouponCode(newCouponCode);

            const response = await AivedhaAPI.registerStartup({
                email: data.email,
                founderName: data.founderName,
                startupName: data.startupName,
                website: data.website,
                pitch: data.pitch,
                stage: data.stage,
                couponCode: newCouponCode
            });

            if (response.success) {
                setShowCoupon(true);
                toast({
                    title: "Welcome to AiVedha Guard!",
                    description: "Your startup account is ready with 3 free credits.",
                });
            } else if (response.message?.includes('already exists') || response.message?.includes('already registered')) {
                toast({
                    title: "Already Registered",
                    description: "This email is already registered in our startup program.",
                    variant: "destructive"
                });
            } else {
                throw new Error(response.message || "Registration failed");
            }
        } catch (error: unknown) {
            logger.error("Startup registration error:", error);
            const errorMessage = getErrorMessage(error);

            if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
                toast({
                    title: "User Already Exists",
                    description: "This email is already registered. Please use a different email or login to your existing account.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Registration Error",
                    description: errorMessage,
                    variant: "destructive"
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyCoupon = () => {
        navigator.clipboard.writeText(couponCode);
        setCopiedToClipboard(true);
        toast({
            title: "Copied!",
            description: "Coupon code copied to clipboard.",
        });
        setTimeout(() => setCopiedToClipboard(false), CLIPBOARD_FEEDBACK_DURATION_MS);
    };

    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            {/* ================================================================== */}
            {/* ANIMATED BACKGROUND */}
            {/* ================================================================== */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Base gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

                {/* Mesh gradient overlay */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `
              radial-gradient(at 20% 30%, rgba(139, 92, 246, 0.3) 0px, transparent 50%),
              radial-gradient(at 80% 20%, rgba(6, 182, 212, 0.3) 0px, transparent 50%),
              radial-gradient(at 40% 80%, rgba(236, 72, 153, 0.2) 0px, transparent 50%),
              radial-gradient(at 90% 70%, rgba(34, 197, 94, 0.2) 0px, transparent 50%)
            `
                    }}
                />

                {/* Animated gradient orbs */}
                <GradientOrb
                    className="top-0 left-0 w-[600px] h-[600px] opacity-20"
                    colors="radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)"
                    animateX={[0, 100, 0]}
                    animateY={[0, 50, 0]}
                    duration={20}
                />
                <GradientOrb
                    className="bottom-0 right-0 w-[700px] h-[700px] opacity-20"
                    colors="radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)"
                    animateX={[0, -80, 0]}
                    animateY={[0, -60, 0]}
                    duration={25}
                />
                <GradientOrb
                    className="top-1/2 left-1/3 w-[500px] h-[500px] opacity-15"
                    colors="radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)"
                    animateX={[0, 60, 0]}
                    animateY={[0, -80, 0]}
                    duration={18}
                />
                <GradientOrb
                    className="top-1/4 right-1/4 w-[400px] h-[400px] opacity-15"
                    colors="radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)"
                    animateX={[0, -40, 0]}
                    animateY={[0, 60, 0]}
                    duration={22}
                />

                {/* Floating particles */}
                {[...Array(15)].map((_, i) => (
                    <FloatingParticle
                        key={i}
                        delay={i * 0.3}
                        duration={8 + (i % 4) * 2}
                        x={`${5 + i * 6}%`}
                        y={`${15 + (i % 5) * 18}%`}
                        size={4 + (i % 3) * 2}
                    />
                ))}

                {/* Grid overlay */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />

                {/* Noise texture */}
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />
            </div>

            {/* ================================================================== */}
            {/* MAIN CONTENT */}
            {/* ================================================================== */}
            <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 lg:py-16">
                {/* ================================================================ */}
                {/* HEADER SECTION */}
                {/* ================================================================ */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-10 md:mb-14"
                >
                    {/* Rotating Slogan */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlogan}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center justify-center gap-3 mb-6"
                        >
                            {(() => {
                                const SloganIcon = SLOGANS[currentSlogan].icon;
                                return (
                                    <motion.div
                                        animate={{ rotate: [0, 10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <SloganIcon className={`w-7 h-7 bg-gradient-to-r ${SLOGANS[currentSlogan].gradient} bg-clip-text`} style={{ color: 'rgb(139, 92, 246)' }} />
                                    </motion.div>
                                );
                            })()}
                            <span className={`text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${SLOGANS[currentSlogan].gradient} bg-clip-text text-transparent`}>
                                {SLOGANS[currentSlogan].text}
                            </span>
                        </motion.div>
                    </AnimatePresence>

                    {/* Main Title */}
                    <motion.h1
                        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="text-white">Startup </span>
                        <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Security Program
                        </span>
                    </motion.h1>

                    {/* Badges */}
                    <motion.div
                        className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-6"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2 text-sm font-semibold shadow-lg shadow-emerald-500/30 border-0">
                            <Gift className="w-4 h-4 mr-2" />
                            3 Free Credits
                        </Badge>
                        <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-2 text-sm font-semibold shadow-lg shadow-violet-500/30 border-0">
                            <Zap className="w-4 h-4 mr-2" />
                            50% OFF for 1 Year
                        </Badge>
                        <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-2 text-sm font-semibold shadow-lg shadow-cyan-500/30 border-0">
                            <Shield className="w-4 h-4 mr-2" />
                            Enterprise Grade
                        </Badge>
                    </motion.div>

                    {/* Subtitle */}
                    <motion.p
                        className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        Protecting your startup shouldn't break the bank. Get enterprise-grade security
                        with our exclusive program designed for founders who refuse to compromise.
                    </motion.p>

                    {/* Statistics */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap justify-center gap-8 md:gap-12 mt-10 pt-8 border-t border-slate-800/50"
                    >
                        {STATISTICS.map((stat, index) => (
                            <StatCard key={stat.label} stat={stat} index={index} />
                        ))}
                    </motion.div>
                </motion.div>

                {/* ================================================================ */}
                {/* MAIN GRID */}
                {/* ================================================================ */}
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
                    {/* ============================================================== */}
                    {/* LEFT COLUMN - BENEFITS */}
                    {/* ============================================================== */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="space-y-8"
                    >
                        {/* Benefits Card */}
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-violet-500/10 overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white text-xl">Startup Benefits</CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Everything you need to secure your startup
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    {BENEFITS.map((benefit, index) => (
                                        <BenefitCard key={benefit.title} benefit={benefit} index={index} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Why Security Matters Card */}
                        <Card className="bg-gradient-to-br from-slate-900/90 via-indigo-950/80 to-slate-900/90 backdrop-blur-xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 overflow-hidden">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                                        <Lock className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Why Startups Need Security</h3>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { stat: "60% of startups", text: "that suffer a cyber attack close within 6 months" },
                                        { stat: "Investors require", text: "security audits before funding rounds" },
                                        { stat: "Customer trust", text: "is your most valuable asset" },
                                        { stat: "Compliance", text: "with GDPR, ISO 27001, SOC 2 opens new markets" }
                                    ].map((item, index) => (
                                        <motion.div
                                            key={item.stat}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + index * 0.1 }}
                                            className="flex items-start gap-3 group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-500/30 transition-colors">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                <strong className="text-white">{item.stat}</strong> {item.text}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Security Features Pills */}
                                <div className="mt-6 pt-6 border-t border-slate-700/50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Security Modules Included</p>
                                    <div className="flex flex-wrap gap-2">
                                        {SECURITY_FEATURES.map((feature, index) => (
                                            <motion.div
                                                key={feature.text}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.7 + index * 0.05 }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-all cursor-default"
                                            >
                                                <feature.icon className="w-3.5 h-3.5" />
                                                {feature.text}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Social Proof Quote */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="relative p-6 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50"
                        >
                            <div className="absolute -top-4 -left-2 text-6xl text-violet-500/20 font-serif">"</div>
                            <p className="text-slate-300 italic relative z-10 pl-4">
                                AiVedha Guard helped us identify critical vulnerabilities before our Series A.
                                The investor due diligence was seamless because we had our security posture documented.
                            </p>
                            <div className="mt-4 flex items-center gap-3 pl-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                                    AS
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">Naveen Pressana</p>
                                    <p className="text-slate-500 text-xs">CTO, VOLTEX (YC W24)</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ============================================================== */}
                    {/* RIGHT COLUMN - FORM */}
                    {/* ============================================================== */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        <AnimatePresence mode="wait">
                            {showCoupon ? (
                                /* ======================================================== */
                                /* SUCCESS STATE */
                                /* ======================================================== */
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                    className="h-full"
                                >
                                    <Card className="bg-gradient-to-br from-emerald-900/90 via-green-900/80 to-teal-900/90 backdrop-blur-xl border border-emerald-500/30 h-full shadow-2xl shadow-emerald-500/20 overflow-hidden">
                                        {/* Decorative background elements */}
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                            <motion.div
                                                className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"
                                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                                                transition={{ duration: 4, repeat: Infinity }}
                                            />
                                            <motion.div
                                                className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl"
                                                animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                                                transition={{ duration: 5, repeat: Infinity }}
                                            />
                                        </div>

                                        <CardContent className="relative pt-10 pb-10 text-center">
                                            {/* Success Icon */}
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                                className="relative w-24 h-24 mx-auto mb-8"
                                            >
                                                <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                                                    <CheckCircle2 className="w-12 h-12 text-white" />
                                                </div>
                                            </motion.div>

                                            <motion.h2
                                                className="text-3xl font-bold text-white mb-3"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                Welcome Aboard, Founder! 🚀
                                            </motion.h2>
                                            <motion.p
                                                className="text-emerald-100 mb-8 text-lg"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.5 }}
                                            >
                                                Your startup account is ready with <strong className="text-white">3 free security credits</strong>
                                            </motion.p>

                                            {/* Coupon Code Card */}
                                            <motion.div
                                                className="bg-black/30 rounded-2xl p-8 mb-8 border-2 border-dashed border-cyan-400/40 relative overflow-hidden"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 }}
                                            >
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

                                                <p className="text-sm text-slate-300 mb-3">Your Exclusive Coupon Code</p>
                                                <p className="text-emerald-300 text-xs mb-4 font-medium">50% OFF for 1 Year • Use Multiple Times</p>

                                                <div className="flex items-center justify-center gap-4 mb-4">
                                                    <div className="relative">
                                                        <code className="text-2xl md:text-3xl font-mono font-bold text-cyan-300 bg-black/50 px-6 py-3 rounded-xl border border-cyan-500/30 inline-block tracking-wider">
                                                            {couponCode}
                                                        </code>
                                                        <motion.div
                                                            className="absolute inset-0 rounded-xl border-2 border-cyan-400"
                                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={copyCoupon}
                                                        className={`border-2 ${copiedToClipboard ? 'border-emerald-400 bg-emerald-500/20' : 'border-cyan-400/50 hover:bg-cyan-500/20'} text-cyan-300 w-12 h-12 rounded-xl transition-all`}
                                                    >
                                                        {copiedToClipboard ? (
                                                            <Check className="w-5 h-5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-5 h-5" />
                                                        )}
                                                    </Button>
                                                </div>

                                                <p className="text-xs text-slate-500">
                                                    Valid for 1 year from today • Apply at checkout on any plan
                                                </p>
                                            </motion.div>

                                            {/* Action Buttons */}
                                            <motion.div
                                                className="flex flex-col sm:flex-row gap-4 justify-center"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.7 }}
                                            >
                                                <Button
                                                    onClick={() => navigate("/dashboard")}
                                                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40"
                                                >
                                                    Go to Dashboard
                                                    <ArrowRight className="w-5 h-5 ml-2" />
                                                </Button>
                                                <Button
                                                    onClick={() => navigate("/security-audit")}
                                                    variant="outline"
                                                    className="border-2 border-emerald-400/50 hover:bg-emerald-500/20 text-emerald-300 px-8 py-6 text-base font-semibold rounded-xl transition-all hover:scale-105"
                                                >
                                                    Start Your First Audit
                                                    <ExternalLink className="w-5 h-5 ml-2" />
                                                </Button>
                                            </motion.div>

                                            {/* Quick Tips */}
                                            <motion.div
                                                className="mt-8 pt-6 border-t border-emerald-500/20"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.8 }}
                                            >
                                                <p className="text-xs text-slate-400 mb-3">Quick Start Guide</p>
                                                <div className="flex flex-wrap justify-center gap-3 text-xs">
                                                    <span className="px-3 py-1.5 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700/50">
                                                        1. Enter your domain
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-slate-600 self-center" />
                                                    <span className="px-3 py-1.5 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700/50">
                                                        2. Run security scan
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-slate-600 self-center hidden sm:block" />
                                                    <span className="px-3 py-1.5 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700/50">
                                                        3. Get AI fixes
                                                    </span>
                                                </div>
                                            </motion.div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ) : (
                                /* ======================================================== */
                                /* REGISTRATION FORM */
                                /* ======================================================== */
                                <motion.div key="form">
                                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-violet-500/10 overflow-hidden">
                                        {/* Decorative top gradient bar */}
                                        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

                                        <CardHeader className="pb-4">
                                            <div className="flex items-center gap-3">
                                                <motion.div
                                                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
                                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                                >
                                                    <Rocket className="w-6 h-6 text-white" />
                                                </motion.div>
                                                <div>
                                                    <CardTitle className="text-white text-xl">Register Your Startup</CardTitle>
                                                    <CardDescription className="text-slate-400">
                                                        Complete the form to activate your benefits
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            <form onSubmit={handleSubmit} className="space-y-5">
                                                {/* Email Field */}
                                                <AnimatedInput
                                                    id="email"
                                                    label="Email Address"
                                                    icon={Mail}
                                                    iconColor="text-cyan-400"
                                                    borderColor="border-cyan-500/30"
                                                    focusBorderColor="from-cyan-400 to-blue-500"
                                                    value={formData.email}
                                                    onChange={(value) => handleChange("email", value)}
                                                    type="email"
                                                    required
                                                    tabIndex={1}
                                                    placeholder="founder@startup.com"
                                                    inputRef={emailInputRef}
                                                />

                                                {/* Two Column Row */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Founder Name */}
                                                    <AnimatedInput
                                                        id="founderName"
                                                        label="Founder Name"
                                                        icon={User}
                                                        iconColor="text-violet-400"
                                                        borderColor="border-violet-500/30"
                                                        focusBorderColor="from-violet-400 to-purple-500"
                                                        value={formData.founderName}
                                                        onChange={(value) => handleChange("founderName", value)}
                                                        required
                                                        tabIndex={2}
                                                        placeholder="Your full name"
                                                    />

                                                    {/* Startup Name */}
                                                    <AnimatedInput
                                                        id="startupName"
                                                        label="Startup Name"
                                                        icon={Building2}
                                                        iconColor="text-pink-400"
                                                        borderColor="border-pink-500/30"
                                                        focusBorderColor="from-pink-400 to-rose-500"
                                                        value={formData.startupName}
                                                        onChange={(value) => handleChange("startupName", value)}
                                                        required
                                                        tabIndex={3}
                                                        placeholder="Your startup name"
                                                    />
                                                </div>

                                                {/* Two Column Row */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Website */}
                                                    <AnimatedInput
                                                        id="website"
                                                        label="Website URL"
                                                        icon={Globe}
                                                        iconColor="text-emerald-400"
                                                        borderColor="border-emerald-500/30"
                                                        focusBorderColor="from-emerald-400 to-green-500"
                                                        value={formData.website}
                                                        onChange={(value) => handleChange("website", value)}
                                                        type="url"
                                                        tabIndex={4}
                                                        placeholder="startup.com"
                                                    />

                                                    {/* Stage */}
                                                    <motion.div
                                                        className="space-y-2"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.25 }}
                                                    >
                                                        <Label htmlFor="stage" className="text-slate-200 flex items-center gap-2 text-sm font-medium">
                                                            <Target className="w-4 h-4 text-amber-400" />
                                                            Startup Stage
                                                        </Label>
                                                        <select
                                                            id="stage"
                                                            tabIndex={5}
                                                            value={formData.stage}
                                                            onChange={(e) => handleChange("stage", e.target.value)}
                                                            className="w-full h-12 px-4 rounded-lg bg-slate-800/70 border-2 border-amber-500/30 text-white focus:border-amber-400 transition-all duration-300 appearance-none cursor-pointer"
                                                            style={{
                                                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                                                backgroundRepeat: 'no-repeat',
                                                                backgroundPosition: 'right 12px center',
                                                                backgroundSize: '18px'
                                                            }}
                                                        >
                                                            <option value="idea" className="bg-slate-900">💡 Idea Stage</option>
                                                            <option value="mvp" className="bg-slate-900">🔧 MVP / Prototype</option>
                                                            <option value="early" className="bg-slate-900">🌱 Early Traction</option>
                                                            <option value="growth" className="bg-slate-900">📈 Growth Stage</option>
                                                            <option value="scale" className="bg-slate-900">🚀 Scaling</option>
                                                        </select>
                                                    </motion.div>
                                                </div>

                                                {/* Pitch Field */}
                                                <motion.div
                                                    className="space-y-2"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                >
                                                    <Label htmlFor="pitch" className="text-slate-200 flex items-center gap-2 text-sm font-medium">
                                                        <Briefcase className="w-4 h-4 text-blue-400" />
                                                        One-line Pitch
                                                        <span className="text-xs text-slate-500 ml-auto">(Optional)</span>
                                                    </Label>
                                                    <Textarea
                                                        id="pitch"
                                                        tabIndex={6}
                                                        value={formData.pitch}
                                                        onChange={(e) => handleChange("pitch", e.target.value)}
                                                        placeholder="We help [target audience] achieve [outcome] by [unique approach]..."
                                                        className="bg-slate-800/70 border-2 border-blue-500/30 text-white placeholder:text-slate-500 focus:border-blue-400 min-h-[90px] rounded-lg transition-all duration-300 resize-none"
                                                    />
                                                </motion.div>

                                                {/* Terms Checkbox */}
                                                <motion.div
                                                    className="flex items-start gap-3 pt-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.35 }}
                                                >
                                                    <Checkbox
                                                        id="terms"
                                                        tabIndex={7}
                                                        checked={formData.acceptTerms}
                                                        onCheckedChange={(checked) => handleChange("acceptTerms", checked as boolean)}
                                                        className="mt-0.5 border-violet-500/50 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                                    />
                                                    <Label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                                                        I accept the{" "}
                                                        <a href="/terms" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                                                            Terms of Service
                                                        </a>{" "}
                                                        and understand that the 50% discount coupon is valid for 1 year, can be used multiple times on plan purchases,
                                                        and may be revoked at Aivibe's discretion. The 3 free credits are granted upon registration.
                                                    </Label>
                                                </motion.div>

                                                {/* Submit Button */}
                                                <motion.div
                                                    className="pt-4"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.4 }}
                                                >
                                                    <motion.button
                                                        type="submit"
                                                        tabIndex={8}
                                                        disabled={isSubmitting || !formData.acceptTerms}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className={`
                              w-full relative overflow-hidden group
                              inline-flex items-center justify-center
                              px-8 py-4 h-14
                              text-base font-bold tracking-wide text-white
                              rounded-xl
                              transition-all duration-300
                              ${formData.acceptTerms
                                                                ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40'
                                                                : 'bg-slate-700 cursor-not-allowed opacity-60'
                                                            }
                            `}
                                                    >
                                                        {/* Animated background shine */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                                                        {isSubmitting ? (
                                                            <>
                                                                <motion.div
                                                                    animate={{ rotate: 360 }}
                                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-3"
                                                                />
                                                                <span>Processing...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Rocket className="w-5 h-5 mr-3 group-hover:animate-bounce" />
                                                                <span>Kick Off</span>
                                                                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                                                            </>
                                                        )}
                                                    </motion.button>
                                                </motion.div>

                                                {/* Social Auth Note */}
                                                <motion.p
                                                    className="text-xs text-slate-500 text-center flex items-center justify-center gap-2"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.45 }}
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    You'll sign in securely with Google or GitHub to verify your identity
                                                </motion.p>
                                            </form>
                                        </CardContent>
                                    </Card>

                                    {/* Quick Value Props */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="mt-6 grid grid-cols-3 gap-4"
                                    >
                                        {[
                                            { icon: MousePointerClick, text: "2-min setup", color: "text-cyan-400" },
                                            { icon: ShieldCheck, text: "No card required", color: "text-emerald-400" },
                                            { icon: Wand2, text: "AI-powered", color: "text-violet-400" }
                                        ].map((item, index) => (
                                            <div key={item.text} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                                <span className="text-xs text-slate-400 font-medium">{item.text}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* ================================================================ */}
                {/* TRUST BADGES SECTION */}
                {/* ================================================================ */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="mt-16 md:mt-20"
                >
                    <div className="text-center mb-8">
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
                            Trusted by Startups Backed By
                        </p>
                        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent mx-auto" />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                        {TRUST_BADGES.map((badge, index) => (
                            <motion.div
                                key={badge.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9 + index * 0.1 }}
                                whileHover={{ scale: 1.1, y: -5 }}
                                className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300 cursor-pointer group"
                            >
                                <img
                                    src={badge.logo}
                                    alt={badge.name}
                                    className={`${badge.height} w-auto ${badge.invert ? 'invert' : ''} grayscale group-hover:grayscale-0 transition-all duration-300`}
                                />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ================================================================ */}
                {/* FOOTER CTA */}
                {/* ================================================================ */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-16 text-center"
                >
                    <p className="text-slate-600 text-sm">
                        Questions? Contact us at{" "}
                        <a href="mailto:{APP_CONFIG.STARTUPS_EMAIL}" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                            startups@aivedha.com
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Startup;