/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { motion } from "framer-motion";

// ============================================================================
// ANIMATED PLAN ICONS - Creative visual representations for each plan
// Dual-theme support with smooth looping animations
// ============================================================================

export interface PlanIconProps {
    size?: number;
    className?: string;
    showName?: boolean;
}

// Plan name and meaning mapping
const PLAN_DETAILS: Record<string, { name: string; nameHindi: string }> = {
    aarambh: { name: "Aarambh", nameHindi: "आरम्भ" },
    raksha: { name: "Raksha", nameHindi: "रक्षा" },
    suraksha: { name: "Suraksha", nameHindi: "सुरक्षा" },
    vajra: { name: "Vajra", nameHindi: "वज्र" },
    chakra: { name: "Chakra", nameHindi: "चक्र" },
};

// Wrapper component that can show name below icon
const PlanIconWrapper: React.FC<{
    children: React.ReactNode;
    planId: string;
    showName?: boolean;
    size: number;
    className?: string;
}> = ({ children, planId, showName, size: _size, className }) => {
    const details = PLAN_DETAILS[planId.toLowerCase()];

    if (!showName) {
        return <>{children}</>;
    }

    return (
        <div className={`flex flex-col items-center ${className || ''}`}>
            {children}
            {details && (
                <div className="mt-1 text-center">
                    <p className="font-semibold text-sm text-foreground">{details.name}</p>
                    <p className="text-xs text-muted-foreground">{details.nameHindi}</p>
                </div>
            )}
        </div>
    );
};

// Size preset mapping for CSS classes
const getSizeClass = (size: number): string => {
    const sizeMap: Record<number, string> = {
        40: 'plan-icon-xs',
        60: 'plan-icon-sm',
        80: 'plan-icon-md',
        100: 'plan-icon-lg',
        120: 'plan-icon-xl',
        150: 'plan-icon-2xl',
    };
    return sizeMap[size] || '';
};

// Aarambh (आरम्भ - The Beginning) - Sunrise/Seed Sprouting Animation
export const AarambhIcon: React.FC<PlanIconProps> = ({ size = 80, className = "", showName = false }) => {
    const sizeClass = getSizeClass(size);
    const customStyle = !sizeClass ? { '--plan-icon-size': `${size}px` } as React.CSSProperties : undefined;

    return (
    <PlanIconWrapper planId="aarambh" showName={showName} size={size} className={className}>
    <div className={`plan-icon-container ${sizeClass}`} style={customStyle}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background circle */}
            <circle cx="50" cy="50" r="45" className="fill-emerald-100 dark:fill-emerald-900/30" />

            {/* Ground */}
            <ellipse cx="50" cy="75" rx="35" ry="8" className="fill-emerald-600/30 dark:fill-emerald-400/20" />

            {/* Seed/Sprout */}
            <motion.g
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: [0.4, 0, 0.2, 1] }}
            >
                <path
                    d="M50 70 C50 70 45 55 50 40 C55 55 50 70 50 70"
                    className="fill-emerald-500 dark:fill-emerald-400"
                />
                {/* Left leaf */}
                <motion.path
                    d="M50 55 C40 50 35 45 40 38 C48 42 50 50 50 55"
                    className="fill-emerald-400 dark:fill-emerald-300 svg-transform-center"
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                    style={{ '--svg-origin': '50px 55px' } as React.CSSProperties}
                />
                {/* Right leaf */}
                <motion.path
                    d="M50 50 C60 45 65 40 60 33 C52 37 50 45 50 50"
                    className="fill-emerald-400 dark:fill-emerald-300 svg-transform-center"
                    animate={{ rotate: [5, -5, 5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                    style={{ '--svg-origin': '50px 50px' } as React.CSSProperties}
                />
            </motion.g>

            {/* Sunrise rays */}
            <motion.g
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 3, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            >
                <circle cx="50" cy="25" r="12" className="fill-amber-400 dark:fill-amber-300" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <motion.line
                        key={i}
                        x1="50"
                        y1="25"
                        x2={50 + 20 * Math.cos((angle * Math.PI) / 180)}
                        y2={25 + 20 * Math.sin((angle * Math.PI) / 180)}
                        className="stroke-amber-400 dark:stroke-amber-300"
                        strokeWidth="2"
                        strokeLinecap="round"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                ))}
            </motion.g>
        </svg>
    </div>
    </PlanIconWrapper>
    );
};

// Raksha (रक्षा - Protection) - Shield with Protective Aura
export const RakshaIcon: React.FC<PlanIconProps> = ({ size = 80, className = "", showName = false }) => {
    const sizeClass = getSizeClass(size);
    const customStyle = !sizeClass ? { '--plan-icon-size': `${size}px` } as React.CSSProperties : undefined;

    return (
    <PlanIconWrapper planId="raksha" showName={showName} size={size} className={className}>
    <div className={`plan-icon-container ${sizeClass}`} style={customStyle}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Protective aura rings - use scale instead of r animation */}
            <motion.g
                style={{ transformOrigin: '50px 50px' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            >
                <circle
                    cx="50" cy="50" r="35"
                    className="stroke-blue-300 dark:stroke-blue-400 fill-none"
                    strokeWidth="1"
                />
            </motion.g>
            <motion.g
                style={{ transformOrigin: '50px 50px' }}
                animate={{ scale: [1, 1.27, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
                <circle
                    cx="50" cy="50" r="30"
                    className="stroke-blue-400 dark:stroke-blue-300 fill-none"
                    strokeWidth="1.5"
                />
            </motion.g>

            {/* Shield body */}
            <motion.path
                d="M50 15 L75 25 L75 50 C75 70 50 85 50 85 C50 85 25 70 25 50 L25 25 Z"
                className="fill-blue-500 dark:fill-blue-400 svg-transform-center"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                style={{ '--svg-origin': '50px 50px' } as React.CSSProperties}
            />

            {/* Shield inner */}
            <path
                d="M50 22 L70 30 L70 48 C70 65 50 77 50 77 C50 77 30 65 30 48 L30 30 Z"
                className="fill-blue-400 dark:fill-blue-300"
            />

            {/* Checkmark */}
            <motion.path
                d="M38 50 L47 59 L62 40"
                className="stroke-white dark:stroke-blue-900"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            />
        </svg>
    </div>
    </PlanIconWrapper>
    );
};

// Suraksha (सुरक्षा - Complete Security) - Fortress/Lock Animation
export const SurakshaIcon: React.FC<PlanIconProps> = ({ size = 80, className = "", showName = false }) => {
    const sizeClass = getSizeClass(size);
    const customStyle = !sizeClass ? { '--plan-icon-size': `${size}px` } as React.CSSProperties : undefined;

    return (
    <PlanIconWrapper planId="suraksha" showName={showName} size={size} className={className}>
    <div className={`plan-icon-container ${sizeClass}`} style={customStyle}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Glow effect - use scale instead of r animation */}
            <motion.g
                style={{ transformOrigin: '50px 50px' }}
                animate={{ scale: [1, 1.16, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            >
                <circle
                    cx="50" cy="50" r="38"
                    className="fill-violet-200/50 dark:fill-violet-500/20"
                />
            </motion.g>

            {/* Fortress base */}
            <rect x="20" y="50" width="60" height="35" rx="3" className="fill-violet-600 dark:fill-violet-500" />

            {/* Fortress towers */}
            <rect x="18" y="40" width="15" height="45" rx="2" className="fill-violet-500 dark:fill-violet-400" />
            <rect x="67" y="40" width="15" height="45" rx="2" className="fill-violet-500 dark:fill-violet-400" />

            {/* Tower tops */}
            <polygon points="25.5,40 18,25 33,25" className="fill-violet-400 dark:fill-violet-300" />
            <polygon points="74.5,40 67,25 82,25" className="fill-violet-400 dark:fill-violet-300" />

            {/* Lock body */}
            <motion.g
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            >
                <rect x="38" y="52" width="24" height="20" rx="3" className="fill-fuchsia-500 dark:fill-fuchsia-400" />
                {/* Lock shackle */}
                <motion.path
                    d="M42 52 L42 45 C42 38 50 35 50 35 C50 35 58 38 58 45 L58 52"
                    className="stroke-fuchsia-400 dark:stroke-fuchsia-300 fill-none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                />
                {/* Keyhole */}
                <circle cx="50" cy="60" r="3" className="fill-violet-900 dark:fill-violet-200" />
                <rect x="48.5" y="60" width="3" height="6" className="fill-violet-900 dark:fill-violet-200" />
            </motion.g>

            {/* Security stars */}
            {[{ x: 15, y: 18 }, { x: 85, y: 18 }, { x: 50, y: 12 }].map((pos, i) => (
                <motion.circle
                    key={i}
                    cx={pos.x}
                    cy={pos.y}
                    r="3"
                    className="fill-fuchsia-300 dark:fill-fuchsia-200"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                />
            ))}
        </svg>
    </div>
    </PlanIconWrapper>
    );
};

// Vajra (वज्र - Thunderbolt) - Lightning Power Animation
export const VajraIcon: React.FC<PlanIconProps> = ({ size = 80, className = "", showName = false }) => {
    const sizeClass = getSizeClass(size);
    const customStyle = !sizeClass ? { '--plan-icon-size': `${size}px` } as React.CSSProperties : undefined;

    return (
    <PlanIconWrapper planId="vajra" showName={showName} size={size} className={className}>
    <div className={`plan-icon-container ${sizeClass}`} style={customStyle}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Energy rings */}
            <motion.circle
                cx="50" cy="50" r="40"
                className="stroke-amber-400 dark:stroke-amber-300 fill-none svg-transform-center svg-origin-center"
                strokeWidth="2"
                strokeDasharray="10 5"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
                cx="50" cy="50" r="32"
                className="stroke-orange-400 dark:stroke-orange-300 fill-none svg-transform-center svg-origin-center"
                strokeWidth="1.5"
                strokeDasharray="8 4"
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            {/* Central power orb */}
            <motion.circle
                cx="50" cy="50" r="18"
                className="svg-fill-var"
                style={{ '--svg-fill': 'url(#vajraGradient)' } as React.CSSProperties}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            />
            <defs>
                <radialGradient id="vajraGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" className="stop-amber-300 dark:stop-amber-200" stopColor="#fcd34d" />
                    <stop offset="100%" className="stop-orange-500 dark:stop-orange-400" stopColor="#f97316" />
                </radialGradient>
            </defs>

            {/* Thunderbolt */}
            <motion.path
                d="M50 20 L42 45 L50 45 L46 80 L58 48 L50 48 L58 20 Z"
                className="fill-amber-400 dark:fill-amber-300 svg-transform-center svg-origin-center"
                animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            />

            {/* Electric sparks */}
            {[0, 72, 144, 216, 288].map((angle, i) => (
                <motion.circle
                    key={i}
                    cx={50 + 38 * Math.cos((angle * Math.PI) / 180)}
                    cy={50 + 38 * Math.sin((angle * Math.PI) / 180)}
                    r="3"
                    className="fill-yellow-300 dark:fill-yellow-200"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
            ))}
        </svg>
    </div>
    </PlanIconWrapper>
    );
};

// Chakra (चक्र - Wheel/Infinite) - Spinning Wheel Animation
export const ChakraIcon: React.FC<PlanIconProps> = ({ size = 80, className = "", showName = false }) => {
    const sizeClass = getSizeClass(size);
    const customStyle = !sizeClass ? { '--plan-icon-size': `${size}px` } as React.CSSProperties : undefined;

    return (
    <PlanIconWrapper planId="chakra" showName={showName} size={size} className={className}>
    <div className={`plan-icon-container ${sizeClass}`} style={customStyle}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer glow - use scale instead of r animation */}
            <motion.g
                style={{ transformOrigin: '50px 50px' }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            >
                <circle
                    cx="50" cy="50" r="42"
                    className="fill-rose-100/50 dark:fill-rose-500/10"
                />
            </motion.g>

            {/* Rotating outer ring */}
            <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="svg-transform-center svg-origin-center"
            >
                <circle cx="50" cy="50" r="38" className="stroke-rose-400 dark:stroke-rose-300 fill-none" strokeWidth="3" />
                {/* Spokes */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                    <line
                        key={i}
                        x1={50 + 25 * Math.cos((angle * Math.PI) / 180)}
                        y1={50 + 25 * Math.sin((angle * Math.PI) / 180)}
                        x2={50 + 38 * Math.cos((angle * Math.PI) / 180)}
                        y2={50 + 38 * Math.sin((angle * Math.PI) / 180)}
                        className="stroke-rose-500 dark:stroke-rose-400"
                        strokeWidth="2"
                    />
                ))}
            </motion.g>

            {/* Inner rotating ring (opposite direction) */}
            <motion.g
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="svg-transform-center svg-origin-center"
            >
                <circle cx="50" cy="50" r="22" className="stroke-amber-500 dark:stroke-amber-400 fill-none" strokeWidth="2" />
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                    <circle
                        key={i}
                        cx={50 + 22 * Math.cos((angle * Math.PI) / 180)}
                        cy={50 + 22 * Math.sin((angle * Math.PI) / 180)}
                        r="4"
                        className="fill-amber-400 dark:fill-amber-300"
                    />
                ))}
            </motion.g>

            {/* Center infinity symbol */}
            <motion.g
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                className="svg-transform-center svg-origin-center"
            >
                <circle cx="50" cy="50" r="12" className="svg-fill-var" style={{ '--svg-fill': 'url(#chakraGradient)' } as React.CSSProperties} />
                <text x="50" y="55" textAnchor="middle" className="fill-white dark:fill-rose-900 font-bold svg-text-lg">∞</text>
            </motion.g>
            <defs>
                <linearGradient id="chakraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
            </defs>

            {/* Orbiting particles - using rotation transform instead of cx/cy animation to avoid SVG attribute errors */}
            {[0, 90, 180, 270].map((startAngle, i) => (
                <motion.g
                    key={i}
                    style={{ transformOrigin: '50px 50px' }}
                    animate={{ rotate: [startAngle, startAngle + 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.25 }}
                >
                    <circle
                        cx="82"
                        cy="50"
                        r="2.5"
                        className="fill-rose-300 dark:fill-rose-200"
                    />
                </motion.g>
            ))}
        </svg>
    </div>
    </PlanIconWrapper>
    );
};

// Map plan IDs to their animated icons
export const PlanIconMap: Record<string, React.FC<PlanIconProps>> = {
    aarambh: AarambhIcon,
    raksha: RakshaIcon,
    suraksha: SurakshaIcon,
    vajra: VajraIcon,
    chakra: ChakraIcon,
};

// Helper function to get animated icon by plan ID
export const getAnimatedPlanIcon = (planId: string): React.FC<PlanIconProps> => {
    return PlanIconMap[planId.toLowerCase()] || AarambhIcon;
};
