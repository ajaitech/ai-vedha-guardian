/**
 * AiVedha Guard - Premium Pricing Page
 * Version: 2.1.0
 * 
 * Features:
 * - Animated plan icons with dual theme support
 * - 3D parallax background effects
 * - Dual theme (light/dark) support
 * - Full keyboard accessibility (WCAG 2.1 AA)
 * - Mobile-first responsive design
 * - SEO optimized with semantic HTML
 * - Zero runtime errors, type-safe
 * - Lightweight animations with CSS transforms
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { logger } from "@/lib/logger";
import { Layout } from "@/components/Layout";
import { PlanIconMap } from "@/components/AnimatedPlanIcons";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useInView, type Variants } from "framer-motion";
import {
    Check,
    Globe,
    TrendingUp,
    Bug,
    Shield,
    ShieldCheck,
    Lock,
    Coins,
    Crown,
    Zap,
    Cpu,
    Award,
    FileCheck,
    FileText,
    Star,
    Sparkles,
    ArrowRight,
    X,
    Play,
    Eye,
    Server,
    CheckCircle2,
    AlertTriangle,
    Gift,
    Timer,
    CreditCard,
    Code,
    Database,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePricing } from "@/hooks/usePricing";
import { WhiteLabelModal } from "@/components/WhiteLabelModal";
import AivedhaAPI from "@/lib/api";
import { CognitoAuth } from "@/lib/cognito";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";

// ============================================================================
// TYPES
// ============================================================================

interface ZooZooProps {
    variant: "wave" | "celebrate" | "think" | "point" | "shield" | "rocket";
    size?: "sm" | "md" | "lg";
    className?: string;
}

interface FloatingOrbProps {
    delay?: number;
    duration?: number;
    size?: number;
    color?: string;
    className?: string;
}

// User subscription types for logged-in user handling
interface UserSubscription {
    isLoggedIn: boolean;
    currentPlanId: string | null;
    planStatus: "active" | "expired" | "cancelled" | "none" | "trial";
    expiresAt: string | null;
    lastPlanId: string | null;
    creditsRemaining: number;
    addons: string[];
}

// ============================================================================
// ANIMATION VARIANTS - For framer-motion variants prop
// Properly typed to satisfy framer-motion's Variants type
// ============================================================================

const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1] // easeOut cubic bezier
        }
    }
};

const fadeInScale: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1]
        }
    }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
};

// ============================================================================
// ZOOZOO ANIMATED MASCOT COMPONENT
// ============================================================================

const ZooZoo: React.FC<ZooZooProps> = ({ variant, size = "md", className = "" }) => {
    const sizeClasses = {
        sm: "w-12 h-16",
        md: "w-16 h-20",
        lg: "w-24 h-32"
    };

    // Animation configurations with properly typed transitions
    const easeInOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

    const waveAnim = {
        initial: { rotate: 0 },
        animate: { rotate: [0, 15, -10, 15, 0] },
        transition: { duration: 2, repeat: Infinity, repeatType: "loop" as const, ease: easeInOut }
    };

    const celebrateAnim = {
        initial: { y: 0, scale: 1 },
        animate: { y: [0, -8, 0], scale: [1, 1.05, 1] },
        transition: { duration: 1.5, repeat: Infinity, repeatType: "loop" as const, ease: easeInOut }
    };

    const thinkAnim = {
        initial: { rotate: 0 },
        animate: { rotate: [0, -5, 5, 0] },
        transition: { duration: 3, repeat: Infinity, repeatType: "loop" as const, ease: easeInOut }
    };

    const pointAnim = {
        initial: { x: 0 },
        animate: { x: [0, 5, 0] },
        transition: { duration: 1.2, repeat: Infinity, repeatType: "loop" as const, ease: easeInOut }
    };

    const shieldAnim = {
        initial: { scale: 1 },
        animate: { scale: [1, 1.08, 1] },
        transition: { duration: 2, repeat: Infinity, repeatType: "loop" as const, ease: easeInOut }
    };

    const rocketAnim = {
        initial: { y: 0, rotate: 0 },
        animate: { y: [0, -6, 0], rotate: [0, 2, -2, 0] },
        transition: { duration: 1.8, repeat: Infinity, repeatType: "loop" as const, ease: easeInOut }
    };

    const animConfigs = {
        wave: waveAnim,
        celebrate: celebrateAnim,
        think: thinkAnim,
        point: pointAnim,
        shield: shieldAnim,
        rocket: rocketAnim
    };

    const anim = animConfigs[variant];

    return (
        <motion.div
            className={`${sizeClasses[size]} ${className}`}
            initial={anim.initial}
            animate={anim.animate}
            transition={anim.transition}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 100 130"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-lg"
            >
                {/* Body - Egg shaped */}
                <ellipse
                    cx="50"
                    cy="75"
                    rx="35"
                    ry="45"
                    className="fill-white dark:fill-gray-100 stroke-gray-300 dark:stroke-gray-400"
                    strokeWidth="2"
                />

                {/* Face area - slightly darker */}
                <ellipse
                    cx="50"
                    cy="55"
                    rx="28"
                    ry="25"
                    className="fill-gray-50 dark:fill-gray-200"
                />

                {/* Eyes */}
                <ellipse cx="38" cy="50" rx="6" ry="8" className="fill-gray-800 dark:fill-gray-900" />
                <ellipse cx="62" cy="50" rx="6" ry="8" className="fill-gray-800 dark:fill-gray-900" />

                {/* Eye shine */}
                <circle cx="40" cy="47" r="2" className="fill-white" />
                <circle cx="64" cy="47" r="2" className="fill-white" />

                {/* Eyebrows based on variant */}
                {variant === "celebrate" && (
                    <>
                        <path d="M30 40 Q38 35 46 40" stroke="currentColor" strokeWidth="2" fill="none" className="stroke-gray-700" />
                        <path d="M54 40 Q62 35 70 40" stroke="currentColor" strokeWidth="2" fill="none" className="stroke-gray-700" />
                    </>
                )}

                {variant === "think" && (
                    <>
                        <path d="M30 42 L46 40" stroke="currentColor" strokeWidth="2" fill="none" className="stroke-gray-700" />
                        <path d="M54 40 L70 42" stroke="currentColor" strokeWidth="2" fill="none" className="stroke-gray-700" />
                    </>
                )}

                {/* Mouth based on variant */}
                {(variant === "wave" || variant === "celebrate") && (
                    <path
                        d="M40 68 Q50 78 60 68"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="none"
                        className="stroke-gray-700 dark:stroke-gray-800"
                    />
                )}

                {variant === "think" && (
                    <circle cx="50" cy="70" r="4" className="fill-gray-700 dark:fill-gray-800" />
                )}

                {(variant === "point" || variant === "shield" || variant === "rocket") && (
                    <path
                        d="M42 68 Q50 74 58 68"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="stroke-gray-700 dark:stroke-gray-800"
                    />
                )}

                {/* Arms based on variant */}
                {variant === "wave" && (
                    <>
                        <motion.ellipse
                            cx="18"
                            cy="70"
                            rx="8"
                            ry="12"
                            className="fill-white dark:fill-gray-100 svg-transform-center"
                            stroke="currentColor"
                            strokeWidth="2"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: [0, 20, -10, 20, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ '--svg-origin': '18px 82px' } as React.CSSProperties}
                        />
                        <ellipse
                            cx="82"
                            cy="80"
                            rx="8"
                            ry="12"
                            className="fill-white dark:fill-gray-100 stroke-gray-300 dark:stroke-gray-400"
                            strokeWidth="2"
                        />
                    </>
                )}

                {variant === "celebrate" && (
                    <>
                        <motion.ellipse
                            cx="15"
                            cy="55"
                            rx="8"
                            ry="12"
                            className="fill-white dark:fill-gray-100 stroke-gray-300"
                            strokeWidth="2"
                            animate={{ y: [0, -5, 0], rotate: [-20, -30, -20] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <motion.ellipse
                            cx="85"
                            cy="55"
                            rx="8"
                            ry="12"
                            className="fill-white dark:fill-gray-100 stroke-gray-300"
                            strokeWidth="2"
                            animate={{ y: [0, -5, 0], rotate: [20, 30, 20] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    </>
                )}

                {variant === "point" && (
                    <>
                        <ellipse
                            cx="18"
                            cy="75"
                            rx="8"
                            ry="12"
                            className="fill-white dark:fill-gray-100 stroke-gray-300"
                            strokeWidth="2"
                        />
                        <motion.g
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        >
                            <ellipse
                                cx="88"
                                cy="65"
                                rx="8"
                                ry="12"
                                className="fill-white dark:fill-gray-100 stroke-gray-300"
                                strokeWidth="2"
                                transform="rotate(-30 88 65)"
                            />
                        </motion.g>
                    </>
                )}

                {variant === "shield" && (
                    <>
                        <ellipse cx="18" cy="75" rx="8" ry="12" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="2" />
                        <ellipse cx="82" cy="75" rx="8" ry="12" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="2" />
                        {/* Shield icon in front */}
                        <motion.g
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <path
                                d="M50 95 L40 100 L40 110 Q40 120 50 125 Q60 120 60 110 L60 100 Z"
                                className="fill-emerald-500 dark:fill-emerald-400"
                                strokeWidth="2"
                            />
                            <path
                                d="M47 108 L50 112 L56 104"
                                stroke="white"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.g>
                    </>
                )}

                {variant === "rocket" && (
                    <>
                        <ellipse cx="18" cy="80" rx="8" ry="12" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="2" />
                        <ellipse cx="82" cy="80" rx="8" ry="12" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="2" />
                        {/* Jetpack */}
                        <rect x="35" y="100" width="30" height="20" rx="5" className="fill-gray-400 dark:fill-gray-500" />
                        <motion.g
                            animate={{ opacity: [1, 0.5, 1], scaleY: [1, 1.3, 1] }}
                            transition={{ duration: 0.3, repeat: Infinity }}
                        >
                            <path d="M40 120 L42 130 L45 120" className="fill-orange-500" />
                            <path d="M48 120 L50 135 L52 120" className="fill-yellow-400" />
                            <path d="M55 120 L58 130 L60 120" className="fill-orange-500" />
                        </motion.g>
                    </>
                )}

                {variant === "think" && (
                    <>
                        <ellipse cx="18" cy="75" rx="8" ry="12" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="2" />
                        {/* Hand on chin */}
                        <ellipse
                            cx="75"
                            cy="68"
                            rx="8"
                            ry="12"
                            className="fill-white dark:fill-gray-100 stroke-gray-300"
                            strokeWidth="2"
                            transform="rotate(30 75 68)"
                        />
                        {/* Thought bubble */}
                        <motion.g
                            animate={{ y: [0, -3, 0], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <circle cx="85" cy="30" r="3" className="fill-gray-300 dark:fill-gray-500" />
                            <circle cx="90" cy="22" r="4" className="fill-gray-300 dark:fill-gray-500" />
                            <circle cx="97" cy="12" r="6" className="fill-gray-300 dark:fill-gray-500" />
                        </motion.g>
                    </>
                )}

                {/* Feet */}
                <ellipse cx="38" cy="118" rx="10" ry="5" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="1.5" />
                <ellipse cx="62" cy="118" rx="10" ry="5" className="fill-white dark:fill-gray-100 stroke-gray-300" strokeWidth="1.5" />
            </svg>
        </motion.div>
    );
};

// ============================================================================
// FLOATING ORB BACKGROUND COMPONENT
// ============================================================================

const FloatingOrb: React.FC<FloatingOrbProps> = ({
    delay = 0,
    duration = 20,
    size = 300,
    color = "from-primary/20 to-accent/20",
    className = ""
}) => (
    <motion.div
        className={`absolute rounded-full bg-gradient-to-br ${color} blur-3xl pointer-events-none floating-orb ${className}`}
        style={{ '--orb-size': `${size}px` } as React.CSSProperties}
        animate={{
            x: [0, 50, -30, 50, 0],
            y: [0, -40, 30, -20, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: [0.4, 0, 0.2, 1]
        }}
        aria-hidden="true"
    />
);

// ============================================================================
// 3D GRID BACKGROUND
// ============================================================================

const Grid3DBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Perspective grid */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] grid-3d-perspective" />

        {/* Floating orbs */}
        <FloatingOrb
            delay={0}
            duration={25}
            size={400}
            color="from-violet-500/10 to-fuchsia-500/10"
            className="top-[-10%] left-[-5%]"
        />
        <FloatingOrb
            delay={5}
            duration={30}
            size={350}
            color="from-cyan-500/10 to-blue-500/10"
            className="top-[20%] right-[-10%]"
        />
        <FloatingOrb
            delay={10}
            duration={22}
            size={300}
            color="from-emerald-500/10 to-teal-500/10"
            className="bottom-[10%] left-[10%]"
        />
        <FloatingOrb
            delay={15}
            duration={28}
            size={250}
            color="from-amber-500/10 to-orange-500/10"
            className="bottom-[30%] right-[5%]"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
    </div>
);

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================

const AnimatedCounter: React.FC<{ value: string; duration?: number }> = ({ value, duration = 2 }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const [displayValue, setDisplayValue] = useState("0");

    useEffect(() => {
        if (!isInView) return;

        const numericMatch = value.match(/[\d.]+/);
        if (!numericMatch) {
            setDisplayValue(value);
            return;
        }

        const target = parseFloat(numericMatch[0]);
        const prefix = value.substring(0, value.indexOf(numericMatch[0]));
        const suffix = value.substring(value.indexOf(numericMatch[0]) + numericMatch[0].length);
        const isDecimal = numericMatch[0].includes('.');

        const start = 0;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * easeOut;

            setDisplayValue(prefix + (isDecimal ? current.toFixed(2) : Math.floor(current).toString()) + suffix);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
            }
        };

        requestAnimationFrame(animate);
    }, [isInView, value, duration]);

    return <span ref={ref}>{displayValue}</span>;
};

// ============================================================================
// ENHANCED PLAN CARD COMPONENT
// ============================================================================

interface EnhancedPlanCardProps {
    plan: {
        id: string;
        name: string;
        sanskrit: string;
        meaning: string;
        credits: number;
        features: string[];
        color: string;
        icon: React.ElementType;
        badge?: "popular" | "enterprise" | "free" | "value";
        recommended?: boolean;
    };
    price: number;
    originalPrice?: number;
    billingCycle: "monthly" | "yearly";
    formatPrice: (price: number) => string;
    index: number;
    // User subscription props
    isCurrentPlan?: boolean;
    isExpiredPlan?: boolean;
    creditsRemaining?: number;
    expiresAt?: string | null;
    isLoggedIn?: boolean;
    // Cart selection handler
    onSelect?: (plan: { id: string; name: string }, price: number, isFree: boolean) => void;
}

const EnhancedPlanCard: React.FC<EnhancedPlanCardProps> = ({
    plan,
    price,
    originalPrice,
    billingCycle,
    formatPrice,
    index,
    isCurrentPlan = false,
    isExpiredPlan = false,
    creditsRemaining = 0,
    expiresAt,
    isLoggedIn = false,
    onSelect
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const gradientColors: Record<string, string> = {
        emerald: "from-emerald-500/20 via-emerald-500/5 to-transparent",
        blue: "from-blue-500/20 via-blue-500/5 to-transparent",
        violet: "from-violet-500/20 via-violet-500/5 to-transparent",
        amber: "from-amber-500/20 via-amber-500/5 to-transparent",
        rose: "from-rose-500/20 via-rose-500/5 to-transparent"
    };

    const borderColors: Record<string, string> = {
        emerald: "hover:border-emerald-500/50",
        blue: "hover:border-blue-500/50",
        violet: "hover:border-violet-500/50",
        amber: "hover:border-amber-500/50",
        rose: "hover:border-rose-500/50"
    };

    const iconBgColors: Record<string, string> = {
        emerald: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
        violet: "bg-violet-500/10 text-violet-500 dark:bg-violet-500/20",
        amber: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
        rose: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20"
    };

    const buttonColors: Record<string, string> = {
        emerald: "bg-emerald-500 hover:bg-emerald-600 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500",
        blue: "bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500",
        violet: "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 focus-visible:ring-violet-500",
        amber: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus-visible:ring-amber-500",
        rose: "bg-rose-500 hover:bg-rose-600 focus-visible:ring-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500"
    };

    const Icon = plan.icon;
    const isFree = price === 0;

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative h-full"
        >
            <Card
                className={`
          relative h-full overflow-hidden transition-all duration-500
          bg-card/80 backdrop-blur-sm dark:bg-card/90
          border-2 border-border/50 dark:border-border/30
          pricing-card-base
          ${isHovered ? 'pricing-card-hovered' : ''}
          ${borderColors[plan.color]}
          ${isCurrentPlan ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 border-emerald-500/50 dark:border-emerald-400/50' : ''}
        `}
                tabIndex={0}
                role="article"
                aria-label={`${plan.name} plan - ${plan.meaning}${isCurrentPlan ? ' (Your current plan)' : ''}`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isCurrentPlan) {
                            const button = cardRef.current?.querySelector('a');
                            button?.click();
                        }
                    }
                }}
            >
                {/* Current Plan Badge - For logged-in users with active subscription */}
                {isCurrentPlan && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 text-white text-xs font-bold py-2 px-4 text-center z-20">
                        <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Your Current Plan</span>
                        </div>
                    </div>
                )}

                {/* Expired Plan Indicator */}
                {isExpiredPlan && !isCurrentPlan && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white text-xs font-bold py-2 px-4 text-center z-20">
                        <div className="flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Last Used Plan (Expired)</span>
                        </div>
                    </div>
                )}



                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b ${gradientColors[plan.color]} pointer-events-none`} />

                <CardContent className={`relative p-6 flex flex-col h-full ${(isCurrentPlan || isExpiredPlan) ? 'pt-12' : ''}`}>
                    {/* Header with Animated Plan Icon */}
                    <div className="text-center mb-4 pt-1">
                        {/* Animated Plan Icon */}
                        <div className={`mx-auto mb-3 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
                            {PlanIconMap[plan.id] ? (
                                React.createElement(PlanIconMap[plan.id], { size: 70, className: "mx-auto" })
                            ) : (
                                <div className={`w-14 h-14 mx-auto rounded-2xl ${iconBgColors[plan.color]} flex items-center justify-center`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-foreground mb-1 font-display">
                            {plan.name}
                        </h3>
                        <p className="text-sm text-muted-foreground italic leading-tight">
                            {plan.sanskrit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            "{plan.meaning}"
                        </p>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-4">
                        {originalPrice && originalPrice > price && (
                            <div className="text-xs text-muted-foreground line-through mb-1">
                                {formatPrice(originalPrice)}
                            </div>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-2xl font-bold text-foreground">
                                {isFree ? "Free" : formatPrice(price)}
                            </span>
                            {!isFree && (
                                <span className="text-muted-foreground text-xs">
                                    /{billingCycle === "yearly" ? "year" : "month"}
                                </span>
                            )}
                        </div>

                        {billingCycle === "yearly" && !isFree && (
                            <Badge variant="secondary" className="mt-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 border-0 text-xs">
                                Save 10% yearly
                            </Badge>
                        )}
                    </div>

                    {/* Credits - Show remaining for current plan */}
                    <div className="bg-muted/50 dark:bg-muted/30 rounded-xl p-3 mb-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <span className="text-xl font-bold text-foreground">
                                {isFree ? 3 : (billingCycle === "yearly" ? plan.credits * 12 : plan.credits)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                                {isFree ? "Credits" : `Credits${billingCycle === "yearly" ? "/year" : "/month"}`}
                            </span>
                        </div>

                        {/* Credits Remaining for Current Plan */}
                        {isCurrentPlan && creditsRemaining !== undefined && (
                            <div className="mt-3 pt-3 border-t border-border/50 dark:border-border/30">
                                <p className="text-sm font-medium text-foreground">
                                    <span className="text-emerald-600 dark:text-emerald-400">{creditsRemaining}</span> credits remaining
                                </p>
                                {expiresAt && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Renews on {new Date(expiresAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CTA button - Different states based on subscription */}
                    {isCurrentPlan ? (
                        <div className="mt-auto">
                            <Button
                                disabled
                                className="w-full py-6 text-base font-semibold rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 cursor-not-allowed border-2 border-emerald-500/30 dark:border-emerald-400/30"
                                size="lg"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Active Plan
                            </Button>
                            <Link
                                to="/dashboard"
                                className="block mt-3 text-center text-sm text-primary hover:underline"
                            >
                                Go to Dashboard →
                            </Link>
                        </div>
                    ) : isFree ? (
                        <div className="mt-auto text-center py-4">
                            <p className="text-sm text-muted-foreground">
                                Free credits added on first login
                            </p>
                        </div>
                    ) : (
                        <div className="mt-auto flex justify-center">
                            <Button
                                onClick={() => onSelect?.({ id: plan.id, name: plan.name }, price, isFree)}
                                variant="default"
                                size="lg"
                                className={`
                      rounded-xl font-semibold shadow-lg
                      ${buttonColors[plan.color]}
                    `}
                            >
                                {isExpiredPlan ? `Renew ${plan.name}` : `Get ${plan.name}`}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

// ============================================================================
// ADDON CARD COMPONENT
// ============================================================================

interface AddonCardProps {
    name: string;
    description: string;
    price: number;
    icon: React.ElementType;
    formatPrice: (price: number) => string;
    popular?: boolean;
    isOwned?: boolean;
    requiresPaidPlan?: boolean;
    onClick?: () => void;
}

const AddonCard: React.FC<AddonCardProps> = ({
    name,
    description,
    price,
    icon: Icon,
    formatPrice,
    popular,
    isOwned = false,
    requiresPaidPlan = false,
    onClick
}) => (
    <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className="relative"
    >
        {/* Owned Badge */}
        {isOwned && (
            <div className="absolute -top-2 -right-2 z-10">
                <Badge className="bg-emerald-500 dark:bg-emerald-600 text-white border-0 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Owned
                </Badge>
            </div>
        )}

        {/* Paid Plan Required Badge */}
        {requiresPaidPlan && !isOwned && (
            <div className="absolute -top-2 -left-2 z-10">
                <Badge className="bg-amber-500 dark:bg-amber-600 text-white border-0 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Paid Plan
                </Badge>
            </div>
        )}

        {/* Popular Badge */}
        {popular && !isOwned && (
            <div className="absolute -top-2 -right-2 z-10">
                <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 text-xs">
                    Popular
                </Badge>
            </div>
        )}

        <Card
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
            className={`
      h-full bg-card/80 dark:bg-card/90 backdrop-blur-sm
      border-border/50 dark:border-border/30 rounded-2xl
      transition-all duration-300 card-invert-hover
      ${onClick ? 'cursor-pointer' : ''}
      ${isOwned ? 'border-emerald-500/50 dark:border-emerald-400/50 bg-emerald-500/5 dark:bg-emerald-500/10' : 'hover:border-primary/50'}
    `}>
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
            ${isOwned ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : 'bg-primary/10 dark:bg-primary/20'}
          `}>
                        <Icon className={`w-6 h-6 ${isOwned ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`} />
                    </div>
                    <div className="flex-grow">
                        <h4 className="font-semibold text-foreground mb-1">{name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{description}</p>
                        {isOwned ? (
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</p>
                        ) : price === 0 ? (
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">FREE<span className="text-sm font-normal text-muted-foreground"> with paid plan</span></p>
                        ) : (
                            <p className="text-lg font-bold text-primary">{formatPrice(price)}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    </motion.div>
);

// ============================================================================
// MAIN PRICING PAGE COMPONENT
// ============================================================================

// Universal features for all plans - matches Lambda v3.0 Enterprise capabilities
const UNIVERSAL_FEATURES = [
    "OWASP Top 10 2021 Full Coverage",
    "SSL/TLS & DNS Security Analysis",
    "Vulnerable Library CVE Detection",
    "AI-Powered Copy-Paste Fixes",
    "PDF Report with Digital Certificate"
] as const;

export default function Pricing() {
    const [, setAnimationsEnabled] = useState(true);

    const {
        billingCycle,
        setBillingCycle,
        couponDiscount,
        couponType,
        formatPrice,
        plans: dynamicPlans,
        creditPacks: dynamicCreditPacks,
        recurringAddons: dynamicRecurringAddons,
        profileCurrencyLoaded,
    } = usePricing();

    // Get subscription data from context (actual backend data)
    const subscriptionContext = useSubscription();

    // USD-only pricing - no currency toggle needed

    // User subscription state - would come from auth context/API in production
    // This simulates a logged-in user's subscription status
    const [userSubscription, setUserSubscription] = useState<UserSubscription>({
        isLoggedIn: false, // Set to true to test logged-in state
        currentPlanId: null,
        planStatus: "none",
        expiresAt: null,
        lastPlanId: null,
        creditsRemaining: 0,
        addons: []
    });

    // Fetch user subscription on mount (simulated - replace with actual API call)
    useEffect(() => {
        // In production, this would be:
        // const fetchSubscription = async () => {
        //   const response = await fetch('/api/user/subscription');
        //   const data = await response.json();
        //   setUserSubscription(data);
        // };
        // fetchSubscription();

        // For demo/testing, check localStorage for logged-in state
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUserSubscription(prev => ({
                    ...prev,
                    isLoggedIn: true,
                    currentPlanId: userData.currentPlanId || null,
                    planStatus: userData.planStatus || "none",
                    expiresAt: userData.expiresAt || null,
                    lastPlanId: userData.lastPlanId || null,
                    creditsRemaining: userData.creditsRemaining || 0,
                    addons: userData.addons || []
                }));
            } catch (e) {
                logger.error("Error parsing user data", e);
            }
        }
    }, []);

    // White Label Modal state
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showWhiteLabelModal, setShowWhiteLabelModal] = useState(false);
    const [whiteLabelConfig, setWhiteLabelConfig] = useState<{ brandName: string; domain: string } | null>(null);

    // Cart state for plan and addon selection
    const [cartPlan, setCartPlan] = useState<{
        id: string;
        name: string;
        billingCycle: "monthly" | "yearly";
        price: number;
    } | null>(null);
    const [cartAddons, setCartAddons] = useState<string[]>([]);
    const [showAddonDialog, setShowAddonDialog] = useState(false);

    // Handle plan selection - show addon dialog instead of direct navigation
    const handlePlanSelect = useCallback((plan: { id: string; name: string }, price: number, isFree: boolean) => {
        if (isFree) {
            // Free plan goes directly to security audit
            navigate("/security-audit");
            return;
        }
        // Set the selected plan and show addon dialog
        setCartPlan({
            id: plan.id,
            name: plan.name,
            billingCycle: billingCycle,
            price: price
        });
        setCartAddons([]); // Reset addons when selecting new plan
        setShowAddonDialog(true);
    }, [navigate, billingCycle]);

    // Toggle addon selection in cart
    const toggleCartAddon = useCallback((addonName: string) => {
        setCartAddons(prev =>
            prev.includes(addonName)
                ? prev.filter(a => a !== addonName)
                : [...prev, addonName]
        );
    }, []);

    // State to track if we need to open WhiteLabel modal before payment
    const [pendingPaymentAfterWhiteLabel, setPendingPaymentAfterWhiteLabel] = useState(false);

    // Proceed to payment with selected plan and addons
    const proceedToPayment = useCallback(() => {
        if (!cartPlan) return;

        // Check if White-Label Reports is selected and user hasn't configured it yet
        if (cartAddons.includes("White-Label Reports") && !whiteLabelConfig) {
            // Show the WhiteLabel modal to collect domain/brand before payment
            setPendingPaymentAfterWhiteLabel(true);
            setShowWhiteLabelModal(true);
            setShowAddonDialog(false);
            return;
        }

        const params = new URLSearchParams();
        params.set("plan", `${cartPlan.id}_${cartPlan.billingCycle}`);

        if (cartAddons.length > 0) {
            params.set("addons", cartAddons.join(","));
        }

        navigate(`/purchase?${params.toString()}`);
    }, [cartPlan, cartAddons, navigate, whiteLabelConfig]);

    // Skip addons and go directly to payment
    const skipAddons = useCallback(() => {
        setShowAddonDialog(false);
        if (!cartPlan) return;
        navigate(`/purchase?plan=${cartPlan.id}_${cartPlan.billingCycle}`);
    }, [cartPlan, navigate]);

    // Fetch existing white label config if user is logged in
    useEffect(() => {
        const fetchWhiteLabelConfig = async () => {
            const currentUser = CognitoAuth.getCurrentUser();
            if (currentUser && userSubscription.isLoggedIn && userSubscription.addons.includes("White-Label Reports")) {
                try {
                    const userId = currentUser.email || currentUser.identityId || currentUser
                    const response = await AivedhaAPI.getWhiteLabelConfig(userId);
                    if (response.config) {
                        setWhiteLabelConfig({
                            brandName: response.config.brand_name,
                            domain: response.config.domain
                        });
                    }
                } catch (error) {
                    logger.error("Failed to fetch white label config:", error);
                }
            }
        };
        fetchWhiteLabelConfig();
    }, [userSubscription.isLoggedIn, userSubscription.addons]);

    // Check if user has an active paid subscription (not free)
    // Uses both localStorage state AND SubscriptionContext for robust validation
    const hasActivePaidSubscription = useCallback(() => {
        // Check subscription context first (most reliable - from backend)
        if (subscriptionContext) {
            const contextStatus = subscriptionContext.subscriptionStatus;
            const contextPlan = subscriptionContext.currentPlan;
            const freePlans = ['free', 'aarambh_free', 'aarambh', null, undefined, ''];

            // If context has active subscription on a paid plan, return true
            if ((contextStatus === 'active' || contextStatus === 'trial') &&
                !freePlans.includes(contextPlan || '')) {
                return true;
            }

            // If user has credits (implies some form of paid access)
            if (subscriptionContext.credits > 0) {
                return true;
            }
        }

        // Fallback to localStorage state
        if (!userSubscription.isLoggedIn) return false;
        if (userSubscription.planStatus !== 'active' && userSubscription.planStatus !== 'trial') return false;
        // Check if plan is not free
        const freePlans = ['free', 'aarambh_free', 'aarambh', null];
        return !freePlans.includes(userSubscription.currentPlanId);
    }, [userSubscription, subscriptionContext]);

    // Handle White Label addon click
    const handleWhiteLabelClick = useCallback(() => {
        const currentUser = CognitoAuth.getCurrentUser();
        if (!currentUser) {
            // User not logged in, redirect to login
            navigate("/login", { state: { from: "/pricing", addon: "whitelabel" } });
            return;
        }

        // Check if user has active paid subscription (addons require paid plan)
        if (!hasActivePaidSubscription()) {
            toast({
                variant: "destructive",
                title: "Paid Plan Required",
                description: "Addons are only available for paid subscribers. Please subscribe to a plan first.",
            });
            // Scroll to plans section
            const plansSection = document.getElementById('plans');
            if (plansSection) {
                plansSection.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        // Open the modal
        setShowWhiteLabelModal(true);
    }, [navigate, hasActivePaidSubscription, toast]);

    // Handle Scheduled Audits addon click
    const handleSchedulerClick = useCallback(() => {
        const currentUser = CognitoAuth.getCurrentUser();
        if (!currentUser) {
            // User not logged in, redirect to login
            navigate("/login", { state: { from: "/scheduler" } });
            return;
        }

        // Check if user has active paid subscription (addons require paid plan)
        if (!hasActivePaidSubscription()) {
            toast({
                variant: "destructive",
                title: "Paid Plan Required",
                description: "Addons are only available for paid subscribers. Please subscribe to a plan first.",
            });
            // Scroll to plans section
            const plansSection = document.getElementById('plans');
            if (plansSection) {
                plansSection.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        // Navigate to scheduler page
        navigate("/scheduler");
    }, [navigate, hasActivePaidSubscription, toast]);

    // NOTE: handleApiAccessClick removed - API Access is auto-included with ALL paid plans (Aarambh to Chakra)
    // Users can manage API keys directly from Profile page

    // Handle White Label Modal submit - supports multiple addons
    const handleWhiteLabelSubmit = useCallback(async (data: { brandName: string; domain: string; id?: string }[]) => {
        const currentUser = CognitoAuth.getCurrentUser();
        if (!currentUser) {
            throw new Error("User not authenticated. Please log in again.");
        }

        const userId = currentUser.email || currentUser.identityId || currentUser.id;

        try {
            // Process all white label configurations
            const results = await Promise.all(
                data.map(async (config) => {
                    const response = await AivedhaAPI.configureWhiteLabel({
                        userId,
                        brandName: config.brandName,
                        domain: config.domain
                    });
                    return { config, response };
                })
            );

            // Check for any failures
            const failures = results.filter(r => !r.response.success);
            if (failures.length > 0) {
                const failedDomains = failures.map(f => f.config.domain).join(", ");
                throw new Error(`Failed to configure: ${failedDomains}`);
            }

            // Update local state with all configs
            setWhiteLabelConfig(data[0]); // Set first config as primary

            // Update local addons list if needed
            if (!userSubscription.addons.includes("White-Label Reports")) {
                setUserSubscription(prev => ({
                    ...prev,
                    addons: [...prev.addons, "White-Label Reports"]
                }));
            }

            const domainCount = data.length;
            toast({
                title: "White Label Configured",
                description: domainCount === 1
                    ? `Your audit reports for ${data[0].domain} will now display your brand "${data[0].brandName}".`
                    : `Successfully configured ${domainCount} white-label domains.`,
            });

            // If we were waiting to proceed to payment after WhiteLabel config, do it now
            if (pendingPaymentAfterWhiteLabel && cartPlan) {
                setPendingPaymentAfterWhiteLabel(false);
                const params = new URLSearchParams();
                params.set("plan", `${cartPlan.id}_${cartPlan.billingCycle}`);
                if (cartAddons.length > 0) {
                    params.set("addons", cartAddons.join(","));
                }
                navigate(`/purchase?${params.toString()}`);
            }
        } catch (error) {
            logger.error("White label configuration failed:", error);
            throw error;
        }
    }, [toast, userSubscription.addons, pendingPaymentAfterWhiteLabel, cartPlan, cartAddons, navigate]);

    // Check if a plan is the current active plan
    const isPlanActive = useCallback((planId: string) => {
        return userSubscription.isLoggedIn &&
            userSubscription.currentPlanId === planId &&
            userSubscription.planStatus === "active";
    }, [userSubscription]);

    // Check if a plan was the last expired plan
    const isPlanExpired = useCallback((planId: string) => {
        return userSubscription.isLoggedIn &&
            userSubscription.lastPlanId === planId &&
            userSubscription.planStatus === "expired";
    }, [userSubscription]);

    // UI metadata mapping for plans (display properties only - pricing comes from API)
    const PLAN_UI_MAP: Record<string, { sanskrit: string; meaning: string; color: string; icon: React.ComponentType<{ className?: string }> }> = useMemo(() => ({
        aarambh: { sanskrit: "आरम्भ", meaning: "The Beginning", color: "emerald", icon: Gift },
        raksha: { sanskrit: "रक्षा", meaning: "Protection", color: "blue", icon: Shield },
        suraksha: { sanskrit: "सुरक्षा", meaning: "Complete Security", color: "violet", icon: Lock },
        vajra: { sanskrit: "वज्र", meaning: "Indestructible", color: "amber", icon: Zap },
        chakra: { sanskrit: "चक्र", meaning: "Divine Disc", color: "rose", icon: Crown },
    }), []);

    // Enhanced plans with UI metadata from API data
    const plans = useMemo(() => {
        return dynamicPlans.map(plan => {
            const uiMeta = PLAN_UI_MAP[plan.id] || {
                sanskrit: "",
                meaning: plan.description || "",
                color: "gray",
                icon: Shield
            };
            return {
                id: plan.id,
                name: plan.name,
                sanskrit: uiMeta.sanskrit,
                meaning: uiMeta.meaning,
                credits: plan.credits,
                features: [...UNIVERSAL_FEATURES],
                color: uiMeta.color,
                icon: uiMeta.icon,
                price: plan.price.monthly
            };
        });
    }, [dynamicPlans, PLAN_UI_MAP]);

    const getPlanPriceLocal = useCallback((plan: typeof plans[0]) => {
        const basePrice = plan.price;
        let price = billingCycle === "yearly" ? basePrice * 12 * 0.9 : basePrice;

        if (couponDiscount > 0) {
            if (couponType === "percentage") {
                price = price * (1 - couponDiscount / 100);
            } else {
                price = Math.max(0, price - couponDiscount);
            }
        }

        return price;
    }, [billingCycle, couponDiscount, couponType]);

    const getOriginalPriceLocal = useCallback((plan: typeof plans[0]) => {
        const basePrice = plan.price;
        return billingCycle === "yearly" ? basePrice * 12 * 0.9 : basePrice;
    }, [billingCycle]);

    // Stats data
    const stats = useMemo(() => [
        { value: "$10.5T", label: "Global cybercrime cost by 2025", icon: TrendingUp, color: "text-rose-500" },
        { value: "43%", label: "Increase in attacks in 2023", icon: Bug, color: "text-amber-500" },
        { value: "$4.45M", label: "Average data breach cost", icon: Shield, color: "text-violet-500" },
        { value: "277", label: "Days to detect a breach", icon: Timer, color: "text-blue-500" }
    ], []);

    // Credit Packs (One-Time) - Dynamically loaded from API
    const creditPacks = useMemo(() => {
        return dynamicCreditPacks.map(pack => ({
            id: pack.id,
            credits: pack.credits,
            price: pack.price,
            savings: pack.savings || 0,
            icon: Coins,
            popular: pack.credits === 25, // 25 credits pack is popular
        }));
    }, [dynamicCreditPacks]);

    // Handle credit pack purchase
    const handleCreditPackClick = (packId: string) => {
        navigate(`/purchase?type=credits&pack=${packId}&currency=USD`);
    };

    // UI metadata for recurring addons (UI-specific properties)
    // IMPORTANT: Codes must match addons.ts RECURRING_ADDONS
    // NOTE: api_access is NOT here - it's auto-included with ALL paid plans (Aarambh to Chakra)
    const ADDON_UI_MAP: Record<string, { icon: React.ComponentType<{ className?: string }>; requiresInput?: boolean; inputFields?: string[]; maxSchedulers?: number }> = useMemo(() => ({
        whitelabel_cert: { icon: FileCheck, requiresInput: true, inputFields: ["brandName", "domain"] },
        scheduled_audits: { icon: Timer, requiresInput: false, maxSchedulers: 1 },
    }), []);

    // Fallback recurring addons if API returns empty
    // IMPORTANT: Names and prices MUST match addons.ts RECURRING_ADDONS
    // NOTE: API Access is NOT listed here - it's auto-included with ALL paid plans (Aarambh to Chakra)
    const FALLBACK_RECURRING_ADDONS = useMemo(() => [
        { name: "White-Label Reports", code: "whitelabel_cert", description: "Custom branded audit reports with your logo. Remove AiVedha branding.", price: 60, popular: true },
        { name: "Scheduled Audits", code: "scheduled_audits", description: "Automate security audits on your schedule. Weekly or monthly.", price: 25, popular: false },
    ], []);

    // Recurring Addons - Dynamically loaded from API
    const addons = useMemo(() => {
        const source = dynamicRecurringAddons.length > 0 ? dynamicRecurringAddons : FALLBACK_RECURRING_ADDONS;
        return source.map((addon: { name: string; code: string; description: string; price?: number; popular?: boolean }) => {
            const uiMeta = ADDON_UI_MAP[addon.code] || { icon: Timer, requiresInput: false, inputFields: undefined, maxSchedulers: undefined };
            return {
                name: addon.name,
                code: addon.code,
                description: addon.description,
                price: addon.price || 0,
                icon: uiMeta.icon,
                requiresInput: uiMeta.requiresInput || false,
                inputFields: uiMeta.inputFields,
                maxSchedulers: uiMeta.maxSchedulers,
                popular: addon.popular || false
            };
        });
    }, [dynamicRecurringAddons, ADDON_UI_MAP, FALLBACK_RECURRING_ADDONS]);

    // Unique selling points - Updated without specific AI model name
    const usps = useMemo(() => [
        { icon: Cpu, title: "AI-Powered Fixes", desc: "Copy-paste code snippets for Apache, Nginx, Node.js, Python & .NET" },
        { icon: Bug, title: "CVE Detection", desc: "Maps vulnerable libraries to known CVEs (jQuery, Angular, Lodash & more)" },
        { icon: Award, title: "ISO 27001 Certified", desc: "Enterprise-grade security practices and compliance" },
        { icon: Globe, title: "195+ Countries", desc: "Trusted by security professionals worldwide" },
        { icon: Zap, title: "21 Security Modules", desc: "DNS, SSL, Headers, APIs, Cookies, Forms, JS, XSS, SQLi, CORS & more" },
        { icon: Shield, title: "OWASP Top 10 2021", desc: "Full A01-A10 coverage with detailed remediation" },
    ], []);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setAnimationsEnabled(!mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setAnimationsEnabled(!e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    // SEO - Set document title and meta tags
    useEffect(() => {
        document.title = "Pricing - AiVedha Guard | Enterprise Website Security Audit Plans";

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Enterprise-grade website security with 21 modules: OWASP Top 10 2021, SSL/TLS, DNS security, CVE detection, XSS, SQL Injection, CORS, cloud security, and AI-powered copy-paste fixes. Free tier available.');
        }
    }, []);

    // Show loading while currency profile is being loaded for logged-in users
    // This ensures overseas users see USD lock correctly from the start
    if (!profileCurrencyLoaded && userSubscription.isLoggedIn) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="relative">
                                <Shield className="h-12 w-12 text-primary animate-pulse" />
                            </div>
                            <p className="text-muted-foreground">Loading your preferences...</p>
                        </motion.div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <>
            <Layout>
                <main
                    className="min-h-screen bg-background relative overflow-hidden"
                    role="main"
                    aria-label="Pricing page"
                >
                    {/* 3D Background */}
                    <Grid3DBackground />

                    {/* Skip to main content link for accessibility */}
                    <a
                        href="#plans"
                        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
                    >
                        Skip to pricing plans
                    </a>

                    <div className="relative z-10">
                        {/* ================================================================
                PRICING PLANS SECTION
            ================================================================ */}
                        <section
                            id="plans"
                            className="py-8 px-4"
                            aria-labelledby="plans-title"
                        >
                            <div className="container mx-auto max-w-7xl">
                                {/* Page Title */}
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center mb-6"
                                >
                                    <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                                        Under $1/Audit • All 21 Modules Included
                                    </Badge>
                                    <h1 id="plans-title" className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                                        Enterprise Security. Simple Pricing.
                                    </h1>
                                    <p className="text-xl text-primary font-medium mb-2">
                                        "The only difference is how many websites you protect."
                                    </p>
                                    <p className="text-muted-foreground max-w-2xl mx-auto">
                                        Every plan includes all 21 security modules, AI-powered fixes,
                                        continuous monitoring, and verified certificates. Choose based on your volume.
                                    </p>
                                </motion.div>

                                {/* Billing Toggle - Centered above cards */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-center mb-8"
                                >
                                    {/* Monthly/Yearly Toggle with 3D glow - Centered */}
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 dark:from-gray-200 dark:via-gray-400 dark:to-gray-200 rounded-full opacity-30 group-hover:opacity-60 blur-sm transition-opacity duration-300"></div>
                                        <div className="relative flex items-center gap-1 bg-muted/80 dark:bg-muted/60 backdrop-blur-sm rounded-full p-1 overflow-visible">
                                            <button
                                                type="button"
                                                onClick={() => setBillingCycle("monthly")}
                                                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingCycle === "monthly"
                                                        ? "bg-primary text-primary-foreground shadow-lg"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }`}
                                            >
                                                Monthly
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBillingCycle("yearly")}
                                                className={`px-6 py-2.5 pr-8 rounded-full text-sm font-medium transition-all relative overflow-visible ${billingCycle === "yearly"
                                                        ? "bg-primary text-primary-foreground shadow-lg"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }`}
                                            >
                                                Yearly
                                                <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full z-10 whitespace-nowrap shadow-lg pointer-events-none">
                                                    -10%
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Plan Cards Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 items-stretch">
                                        {plans.map((plan, index) => (
                                            <EnhancedPlanCard
                                                key={plan.id}
                                                plan={plan}
                                                price={getPlanPriceLocal(plan)}
                                                originalPrice={couponDiscount > 0 ? getOriginalPriceLocal(plan) : undefined}
                                                billingCycle={billingCycle}
                                                formatPrice={formatPrice}
                                                index={index}
                                                // User subscription props
                                                isLoggedIn={userSubscription.isLoggedIn}
                                                isCurrentPlan={isPlanActive(plan.id)}
                                                isExpiredPlan={isPlanExpired(plan.id)}
                                                creditsRemaining={isPlanActive(plan.id) ? userSubscription.creditsRemaining : undefined}
                                                expiresAt={isPlanActive(plan.id) ? userSubscription.expiresAt : undefined}
                                                onSelect={handlePlanSelect}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>

                        {/* ================================================================
                CREDIT PACKS & POWERUP ADDONS - 70:30 LAYOUT
            ================================================================ */}
                        <section
                            className="py-10 px-4 bg-muted/30 rounded-3xl mx-4"
                            aria-labelledby="credit-addons-title"
                        >
                            <div className="container mx-auto max-w-7xl">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={staggerContainer}
                                >
                                    <motion.div variants={fadeInUp} className="text-center mb-8">
                                        <div className="flex items-center justify-center gap-4 mb-3">
                                            <ZooZoo variant="point" size="sm" />
                                            <h2 id="credit-addons-title" className="text-3xl font-bold text-foreground">
                                                Credits & Power-Ups
                                            </h2>
                                            <ZooZoo variant="wave" size="sm" />
                                        </div>
                                        <p className="text-muted-foreground">
                                            Top up with credit packs or enhance with recurring power-ups
                                        </p>
                                    </motion.div>

                                    {/* 70:30 Layout Grid */}
                                    <div className="grid lg:grid-cols-10 gap-6">
                                        {/* 70% - Credit Packs */}
                                        <div className="lg:col-span-7 flex flex-col">
                                            <div className="mb-4 text-center">
                                                <h3 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
                                                    <Coins className="w-5 h-5 text-amber-500" />
                                                    One-Time Credit Packs
                                                </h3>
                                                <p className="text-sm text-muted-foreground">No subscription required</p>
                                            </div>
                                            {/* 2 rows: 3 cards centered on top, 2 cards centered on bottom */}
                                            <div className="flex-1 flex flex-col justify-center gap-4">
                                                {/* Row 1: First 3 credit packs */}
                                                <div className="flex justify-center gap-3">
                                                    {creditPacks.slice(0, 3).map((pack, index) => (
                                                        <motion.div
                                                            key={pack.id || index}
                                                            variants={fadeInScale}
                                                            whileHover={{ y: -6, scale: 1.03 }}
                                                            className="relative card-3d-shine w-[140px]"
                                                            onClick={() => handleCreditPackClick(pack.id)}
                                                        >
                                                            {pack.popular && (
                                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                                                                    <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 text-xs whitespace-nowrap">
                                                                        Best Value
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            <Card className={`h-full bg-card/80 backdrop-blur-sm border-border/50 rounded-2xl card-invert-hover transition-all duration-300 cursor-pointer ${pack.popular ? 'ring-2 ring-violet-500/50' : ''}`}>
                                                                <CardContent className="p-4 text-center">
                                                                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                                                                        <Coins className="w-5 h-5 text-amber-500" />
                                                                    </div>
                                                                    <p className="text-xl font-bold text-foreground mb-0.5">
                                                                        {pack.credits}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mb-2">Credits</p>
                                                                    <p className="text-base font-bold text-primary">
                                                                        {formatPrice(pack.price)}
                                                                    </p>
                                                                </CardContent>
                                                            </Card>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                                {/* Row 2: Last 2 credit packs */}
                                                <div className="flex justify-center gap-3">
                                                    {creditPacks.slice(3, 5).map((pack, index) => (
                                                        <motion.div
                                                            key={pack.id || index + 3}
                                                            variants={fadeInScale}
                                                            whileHover={{ y: -6, scale: 1.03 }}
                                                            className="relative card-3d-shine w-[140px]"
                                                            onClick={() => handleCreditPackClick(pack.id)}
                                                        >
                                                            {pack.popular && (
                                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                                                                    <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 text-xs whitespace-nowrap">
                                                                        Best Value
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            <Card className={`h-full bg-card/80 backdrop-blur-sm border-border/50 rounded-2xl card-invert-hover transition-all duration-300 cursor-pointer ${pack.popular ? 'ring-2 ring-violet-500/50' : ''}`}>
                                                                <CardContent className="p-4 text-center">
                                                                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                                                                        <Coins className="w-5 h-5 text-amber-500" />
                                                                    </div>
                                                                    <p className="text-xl font-bold text-foreground mb-0.5">
                                                                        {pack.credits}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mb-2">Credits</p>
                                                                    <p className="text-base font-bold text-primary">
                                                                        {formatPrice(pack.price)}
                                                                    </p>
                                                                </CardContent>
                                                            </Card>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 30% - Power-Up Recurring Addons */}
                                        <div className="lg:col-span-3">
                                            <div className="mb-4">
                                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                                    <Sparkles className="w-5 h-5 text-violet-500" />
                                                    Power-Up Addons
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Recurring monthly</p>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {addons.map((addon, index) => (
                                                    <motion.div key={index} variants={fadeInUp} className="card-3d-shine">
                                                        <AddonCard
                                                            name={addon.name}
                                                            description={addon.description}
                                                            price={addon.price ?? 0}
                                                            icon={addon.icon}
                                                            formatPrice={formatPrice}
                                                            popular={addon.popular}
                                                            isOwned={userSubscription.isLoggedIn && userSubscription.addons.includes(addon.name)}
                                                            requiresPaidPlan={userSubscription.isLoggedIn && !hasActivePaidSubscription()}
                                                            onClick={addon.code === "whitelabel_cert" ? handleWhiteLabelClick : addon.code === "scheduled_audits" ? handleSchedulerClick : undefined}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* ================================================================
                COMMON FEATURES FOR ALL PLANS SECTION
            ================================================================ */}
                        <section
                            className="py-10 px-4 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-3xl mx-4 mt-4"
                            aria-labelledby="features-title"
                        >
                            <div className="container mx-auto max-w-6xl">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={staggerContainer}
                                >
                                    <motion.div variants={fadeInUp} className="text-center mb-10">
                                        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                                            <ShieldCheck className="w-4 h-4 mr-2" />
                                            Uncompromised Security at All Levels
                                        </Badge>
                                        <h2 id="features-title" className="text-3xl font-bold text-foreground mb-4">
                                            All Plans Include These Powerful Features
                                        </h2>
                                        <p className="text-muted-foreground max-w-2xl mx-auto">
                                            Every AiVedha plan delivers enterprise-grade security scanning with our complete 21-module audit system.
                                        </p>
                                    </motion.div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[
                                            { icon: Shield, title: "OWASP Top 10 Scanning", desc: "Complete detection of all critical vulnerabilities including injection, XSS, and authentication issues" },
                                            { icon: Lock, title: "Deep SSL/TLS Analysis", desc: "Certificate validation, protocol version checks, cipher strength assessment with grade scoring" },
                                            { icon: Cpu, title: "Technology Detection", desc: "Framework and library identification with CVE correlation for known vulnerabilities" },
                                            { icon: Bug, title: "Sensitive Data Exposure", desc: "Scan for exposed API keys, credentials, JWT tokens, and other secrets in source code" },
                                            { icon: FileCheck, title: "Security Headers Check", desc: "Comprehensive analysis of HSTS, CSP, X-Frame-Options, and all critical headers" },
                                            { icon: Eye, title: "AI-Powered Remediation", desc: "AI-powered fix recommendations with copy-paste ready code solutions" },
                                            { icon: Server, title: "DNS Security Analysis", desc: "DNSSEC validation, SPF/DKIM/DMARC checks, and DNS configuration security" },
                                            { icon: Database, title: "Sensitive File Detection", desc: "Checks 80+ critical paths including .git, .env, backup files, and admin panels" },
                                            { icon: Code, title: "JavaScript Security", desc: "Detection of vulnerable libraries with known CVEs like jQuery XSS and lodash issues" },
                                            { icon: Award, title: "Security Certificate", desc: "Shareable security certificates with unique verification codes for each audit" },
                                            { icon: FileText, title: "Detailed PDF Reports", desc: "Professional audit reports with findings, risk scores, and remediation steps" },
                                            { icon: Globe, title: "API Security Testing", desc: "Swagger/OpenAPI detection, GraphQL discovery, and API key exposure scanning" },
                                        ].map((feature, index) => (
                                            <motion.div
                                                key={index}
                                                variants={fadeInUp}
                                                whileHover={{ y: -5, scale: 1.02 }}
                                                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all duration-300"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <feature.icon className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                                                        <p className="text-sm text-muted-foreground mb-2">{feature.desc}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <motion.div variants={fadeInUp} className="text-center mt-10">
                                        <p className="text-lg font-semibold text-primary mb-2">
                                            "Same powerful security engine. Different credit allocations."
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Choose your plan based on how many audits you need — every scan uses the same enterprise-grade technology.
                                        </p>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </section>

                        {/* ================================================================
                WHY SECURITY MATTERS SECTION
            ================================================================ */}
                        <section
                            className="py-10 px-4 mt-4"
                            aria-labelledby="stats-title"
                        >
                            <div className="container mx-auto max-w-6xl">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={staggerContainer}
                                >
                                    <motion.div variants={fadeInUp} className="text-center mb-12">
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <ZooZoo variant="think" size="sm" />
                                            <h2 id="stats-title" className="text-3xl font-bold text-foreground">
                                                Why Security Can't Wait
                                            </h2>
                                            <ZooZoo variant="point" size="sm" />
                                        </div>
                                        <p className="text-muted-foreground max-w-2xl mx-auto">
                                            The cyber threat landscape grows more dangerous every day. These numbers tell the story.
                                        </p>
                                    </motion.div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {stats.map((stat, index) => (
                                            <motion.div
                                                key={index}
                                                variants={fadeInScale}
                                                whileHover={{ y: -4 }}
                                            >
                                                <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300">
                                                    <CardContent className="p-6 text-center">
                                                        <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-4`} />
                                                        <p className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                                                            <AnimatedCounter value={stat.value} />
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* ================================================================
                WHY US SECTION
            ================================================================ */}
                        <section
                            className="py-16 px-4 bg-muted/30"
                            aria-labelledby="why-us-title"
                        >
                            <div className="container mx-auto max-w-6xl">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={staggerContainer}
                                >
                                    <motion.div variants={fadeInUp} className="text-center mb-12">
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <ZooZoo variant="shield" size="sm" />
                                            <h2 id="why-us-title" className="text-3xl font-bold text-foreground">
                                                Why Choose AiVedha Guard?
                                            </h2>
                                            <ZooZoo variant="think" size="sm" />
                                        </div>
                                        <p className="text-muted-foreground max-w-2xl mx-auto">
                                            We're not just another security scanner. We're your AI-powered security partner.
                                        </p>
                                    </motion.div>

                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {usps.map((usp, index) => (
                                            <motion.div
                                                key={index}
                                                variants={fadeInUp}
                                                whileHover={{ y: -4 }}
                                            >
                                                <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300">
                                                    <CardContent className="p-6">
                                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                                            <usp.icon className="w-6 h-6 text-primary" />
                                                        </div>
                                                        <h3 className="font-semibold text-foreground mb-2">{usp.title}</h3>
                                                        <p className="text-sm text-muted-foreground">{usp.desc}</p>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>

                                </motion.div>
                            </div>
                        </section>

                        {/* ================================================================
                TRUST BADGES SECTION
            ================================================================ */}
                        <section
                            className="py-16 px-4"
                            aria-labelledby="trust-title"
                        >
                            <div className="container mx-auto max-w-4xl">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={staggerContainer}
                                >
                                    <motion.h2
                                        id="trust-title"
                                        variants={fadeInUp}
                                        className="text-2xl font-bold text-center text-foreground mb-8"
                                    >
                                        Trusted by Security Professionals Worldwide
                                    </motion.h2>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {[
                                            { icon: Shield, text: "21 Security Modules" },
                                            { icon: Award, text: "ISO 27001 Certified" },
                                            { icon: Bug, text: "OWASP Top 10 2021" },
                                            { icon: Cpu, text: "AI-Powered Fixes" },
                                            { icon: Globe, text: "195+ Countries" }
                                        ].map((item, index) => (
                                            <motion.div
                                                key={index}
                                                variants={fadeInScale}
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <Card className="p-4 bg-card/50 rounded-2xl border-border/50 text-center hover:border-primary/30 transition-colors">
                                                    <item.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                                                    <p className="text-xs font-medium text-foreground">{item.text}</p>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* ================================================================
                CTA SECTION - COMPACT
            ================================================================ */}
                        <section
                            className="py-8 px-4"
                            aria-labelledby="cta-title"
                        >
                            <div className="container mx-auto max-w-5xl">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={fadeInUp}
                                >
                                    <Card className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border-violet-500/20">
                                        {/* Background decoration */}
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-fuchsia-500/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true" />

                                        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
                                            {/* Left side - ZooZoo */}
                                            <div className="hidden lg:block flex-shrink-0">
                                                <ZooZoo variant="wave" size="md" />
                                            </div>

                                            {/* Center - Content */}
                                            <div className="text-center lg:text-left flex-grow">
                                                <h2 id="cta-title" className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                                    Ready to Secure Your Digital World?
                                                </h2>
                                                <p className="text-sm text-muted-foreground max-w-lg">
                                                    Start free with Aarambh. Scale to Chakra as you grow.
                                                </p>
                                            </div>

                                            {/* Right side - buttons & ZooZoo */}
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="flex flex-wrap justify-center gap-3">
                                                    <Link to="/security-audit">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-full"
                                                        >
                                                            <Play className="w-3 h-3 mr-1.5" />
                                                            Try Free
                                                        </Button>
                                                    </Link>
                                                    <Link to="/purchase?plan=suraksha_monthly">
                                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25"
                                                            >
                                                                <Star className="w-3 h-3 mr-1.5" />
                                                                Get Suraksha
                                                            </Button>
                                                        </motion.div>
                                                    </Link>
                                                    <Link to="/purchase?plan=chakra_monthly">
                                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
                                                            >
                                                                <Crown className="w-3 h-3 mr-1.5" />
                                                                Enterprise
                                                            </Button>
                                                        </motion.div>
                                                    </Link>
                                                </div>
                                                <div className="hidden lg:block">
                                                    <ZooZoo variant="rocket" size="md" />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            </div>
                        </section>
                    </div>
                </main>

                {/* White Label Modal */}
                <WhiteLabelModal
                    isOpen={showWhiteLabelModal}
                    onClose={() => setShowWhiteLabelModal(false)}
                    onSubmit={handleWhiteLabelSubmit}
                    currency="USD"
                    price={60}
                    existingConfigs={whiteLabelConfig ? [whiteLabelConfig] : []}
                />

                {/* Addon Selection Dialog */}
                <AnimatePresence>
                    {showAddonDialog && cartPlan && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowAddonDialog(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto border border-border"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="p-6 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">
                                                Enhance Your Plan
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Selected: <span className="font-medium text-primary">{cartPlan.name}</span> ({formatPrice(cartPlan.price)}/{billingCycle === "yearly" ? "year" : "month"})
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddonDialog(false)}
                                            className="p-2 rounded-full hover:bg-muted transition-colors"
                                            aria-label="Close dialog"
                                            title="Close"
                                        >
                                            <X className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>

                                {/* Addons List */}
                                <div className="p-6 space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Would you like to add any extras to your subscription?
                                    </p>

                                    {addons.map((addon) => {
                                        const addonPrice = addon.price ?? 0;
                                        const isSelected = cartAddons.includes(addon.name);
                                        const AddonIcon = addon.icon;

                                        return (
                                            <div
                                                key={addon.code}
                                                onClick={() => toggleCartAddon(addon.name)}
                                                className={`
                                                    p-4 rounded-xl border-2 cursor-pointer transition-all
                                                    ${isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50 bg-card"
                                                    }
                                                `}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`
                                                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                                        ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                                                    `}>
                                                        <AddonIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-semibold text-foreground mb-1">{addon.name}</h4>
                                                            <span className="font-bold text-primary">
                                                                {formatPrice(addonPrice)}/{billingCycle === "yearly" ? "year" : "month"}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {addon.description}
                                                        </p>
                                                    </div>
                                                    <div className={`
                                                        w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                                                        ${isSelected
                                                            ? "border-primary bg-primary text-white"
                                                            : "border-muted-foreground"
                                                        }
                                                    `}>
                                                        {isSelected && <Check className="w-4 h-4" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer with Actions */}
                                <div className="p-6 border-t border-border bg-muted/30">
                                    {/* Cart Summary */}
                                    {cartAddons.length > 0 && (
                                        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                            <p className="text-sm font-medium text-foreground">Cart Summary:</p>
                                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                                <div className="flex justify-between">
                                                    <span>{cartPlan.name} Plan</span>
                                                    <span>{formatPrice(cartPlan.price)}</span>
                                                </div>
                                                {cartAddons.map(addonName => {
                                                    const addon = addons.find(a => a.name === addonName);
                                                    const price = addon ? (addon.price ?? 0) : 0;
                                                    return (
                                                        <div key={addonName} className="flex justify-between">
                                                            <span>{addonName}</span>
                                                            <span>{formatPrice(price)}</span>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                                                    <span>Total</span>
                                                    <span>
                                                        {formatPrice(
                                                            cartPlan.price +
                                                            cartAddons.reduce((sum, name) => {
                                                                const addon = addons.find(a => a.name === name);
                                                                return sum + (addon ? (addon.price ?? 0) : 0);
                                                            }, 0)
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 justify-center">
                                        <Button
                                            variant="outline"
                                            size="default"
                                            onClick={skipAddons}
                                        >
                                            Skip Addons
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="default"
                                            onClick={proceedToPayment}
                                        >
                                            {cartAddons.length > 0 ? "Proceed with Addons" : "Continue to Payment"}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Cart button - Shows when plan is selected but dialog is closed */}
                <AnimatePresence>
                    {cartPlan && !showAddonDialog && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 right-6 z-40"
                        >
                            <Button
                                onClick={proceedToPayment}
                                variant="default"
                                className="h-14 px-6 rounded-full shadow-2xl flex items-center gap-3"
                            >
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5" />
                                    <span className="font-semibold">
                                        Proceed to Payment
                                    </span>
                                </div>
                                <Badge className="bg-white/20 text-white border-0">
                                    {formatPrice(
                                        cartPlan.price +
                                        cartAddons.reduce((sum, name) => {
                                            const addon = addons.find(a => a.name === name);
                                            return sum + (addon ? (addon.price ?? 0) : 0);
                                        }, 0)
                                    )}
                                </Badge>
                            </Button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCartPlan(null);
                                    setCartAddons([]);
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                                aria-label="Clear selection"
                                title="Clear selection"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Layout>
        </>
    );
}