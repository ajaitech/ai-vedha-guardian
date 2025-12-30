import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Scan, CheckCircle } from "lucide-react";

interface CyberShieldHeroProps {
  onOpenLoginPopup?: () => void;
}

export const CyberShieldHero = ({ onOpenLoginPopup }: CyberShieldHeroProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [scanLine, setScanLine] = useState(0);

  // Continuous scan line animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanLine((prev) => (prev + 1) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (isActivating || isActivated) return;

    setIsActivating(true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([30, 20, 30, 20, 50]);
    }

    setTimeout(() => {
      setIsActivated(true);

      setTimeout(() => {
        const userStr = localStorage.getItem("currentUser");
        if (userStr) {
          navigate("/security-audit");
        } else {
          if (onOpenLoginPopup) {
            onOpenLoginPopup();
            setTimeout(() => {
              setIsActivating(false);
              setIsActivated(false);
            }, 500);
          } else {
            navigate("/login");
          }
        }
      }, 600);
    }, 800);
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Main Container */}
      <motion.div
        className="relative w-80 h-80 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Outer Rotating Hexagon Ring */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="hexGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <polygon
              points="100,10 180,50 180,150 100,190 20,150 20,50"
              fill="none"
              stroke="url(#hexGrad1)"
              strokeWidth="1"
              strokeDasharray="8 4"
              className="opacity-60"
            />
          </svg>
        </motion.div>

        {/* Middle Rotating Ring (Opposite Direction) */}
        <motion.div
          className="absolute inset-6"
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="4 8 20 8"
              className="opacity-50"
            />
          </svg>
        </motion.div>

        {/* Inner Pulsing Circle */}
        <motion.div
          className="absolute inset-12 rounded-full"
          animate={{
            boxShadow: isActivated
              ? ["0 0 60px rgba(34,197,94,0.6)", "0 0 80px rgba(34,197,94,0.8)"]
              : isHovered
              ? ["0 0 40px rgba(6,182,212,0.4)", "0 0 60px rgba(6,182,212,0.6)", "0 0 40px rgba(6,182,212,0.4)"]
              : ["0 0 20px rgba(6,182,212,0.2)", "0 0 40px rgba(6,182,212,0.4)", "0 0 20px rgba(6,182,212,0.2)"]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Scanning Line Effect */}
        <div className="absolute inset-16 rounded-full overflow-hidden">
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            style={{ top: `${scanLine}%` }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Main Shield Container */}
        <motion.div
          className={`
            absolute inset-16 rounded-full
            flex items-center justify-center
            bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
            border-2 transition-all duration-500
            ${isActivated
              ? 'border-green-400 shadow-[0_0_50px_rgba(34,197,94,0.5)]'
              : 'border-cyan-500/60 hover:border-cyan-400'
            }
          `}
          animate={{
            scale: isActivating && !isActivated ? [1, 1.05, 1] : 1
          }}
        >
          {/* Sparkle Edge Effect on Hover */}
          <AnimatePresence>
            {isHovered && !isActivating && !isActivated && (
              <>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute w-1.5 h-1.5 rounded-full bg-white"
                    style={{
                      left: `${50 + 48 * Math.cos((angle * Math.PI) / 180)}%`,
                      top: `${50 + 48 * Math.sin((angle * Math.PI) / 180)}%`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5],
                      boxShadow: ['0 0 5px #fff', '0 0 15px #0ea5e9', '0 0 5px #fff']
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Curved "CLICK TO SCAN" Text Inside Circle */}
          <AnimatePresence>
            {!isActivating && !isActivated && (
              <motion.svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 200 200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <defs>
                  {/* Circular arc path - follows the inner edge of the circle, positioned outward */}
                  <path
                    id="curvedTextPath"
                    d="M 20 140 A 90 90 0 0 0 180 140"
                    fill="none"
                  />
                  {/* Glossy text gradient */}
                  <linearGradient id="glossyText" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#67e8f9" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                  {/* Glow filter for text */}
                  <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Curved text - 3 words, no dots */}
                <text
                  fill="url(#glossyText)"
                  filter="url(#textGlow)"
                  style={{
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.25em',
                    textShadow: '0 0 10px rgba(6,182,212,0.8)'
                  }}
                >
                  <textPath href="#curvedTextPath" startOffset="50%" textAnchor="middle">
                    CLICK TO SCAN
                  </textPath>
                </text>
              </motion.svg>
            )}
          </AnimatePresence>

          {/* Inner Gradient Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />

          {/* Hexagonal Grid Pattern */}
          <div className="absolute inset-4 rounded-full overflow-hidden opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <pattern id="hexGrid" width="10" height="17.32" patternUnits="userSpaceOnUse">
                <polygon points="5,0 10,2.89 10,8.66 5,11.55 0,8.66 0,2.89" fill="none" stroke="#0ea5e9" strokeWidth="0.3"/>
              </pattern>
              <rect width="100" height="100" fill="url(#hexGrid)" />
            </svg>
          </div>

          {/* Central Shield Icon with Lock */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Shield with nested elements */}
            <motion.div
              className="relative"
              animate={{
                y: isActivated ? 0 : [0, -3, 0],
                rotate: isActivated ? [0, 5, -5, 0] : 0
              }}
              transition={{
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0.5 }
              }}
            >
              {/* Outer Shield Glow */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                animate={{
                  background: isActivated
                    ? ["radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)", "radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)"]
                    : ["radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)", "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)"]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              {/* Shield SVG */}
              <svg viewBox="0 0 80 90" className="w-20 h-24 relative z-10">
                <defs>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isActivated ? "#22c55e" : "#0ea5e9"} />
                    <stop offset="50%" stopColor={isActivated ? "#16a34a" : "#3b82f6"} />
                    <stop offset="100%" stopColor={isActivated ? "#15803d" : "#6366f1"} />
                  </linearGradient>
                  <filter id="shieldShadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={isActivated ? "#22c55e" : "#0ea5e9"} floodOpacity="0.5"/>
                  </filter>
                </defs>

                {/* Shield Path */}
                <motion.path
                  d="M40 5 L75 20 L75 45 C75 65 55 80 40 88 C25 80 5 65 5 45 L5 20 Z"
                  fill="url(#shieldGrad)"
                  filter="url(#shieldShadow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />

                {/* Shield Highlight */}
                <path
                  d="M40 10 L70 23 L70 45 C70 62 52 75 40 82"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />

                {/* Lock Icon in Shield */}
                <AnimatePresence mode="wait">
                  {isActivated ? (
                    <motion.g
                      key="checkmark"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Checkmark */}
                      <path
                        d="M25 45 L35 55 L55 35"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.g>
                  ) : (
                    <motion.g
                      key="lock"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      animate={{
                        y: isActivating ? [0, -2, 0] : 0
                      }}
                      transition={{ duration: 0.3, repeat: isActivating ? 3 : 0 }}
                    >
                      {/* Lock Shackle */}
                      <path
                        d={isActivating
                          ? "M30 40 L30 28 C30 20 35 16 40 16 C45 16 50 20 50 28 L50 28"
                          : "M30 40 L30 32 C30 24 35 20 40 20 C45 20 50 24 50 32 L50 40"
                        }
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Lock Body */}
                      <rect x="26" y="40" width="28" height="22" rx="4" fill="white" />
                      {/* Keyhole */}
                      <circle cx="40" cy="48" r="4" fill={isActivated ? "#22c55e" : "#0ea5e9"} />
                      <rect x="38" y="50" width="4" height="8" rx="1" fill={isActivated ? "#22c55e" : "#0ea5e9"} />
                    </motion.g>
                  )}
                </AnimatePresence>
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Orbiting Particles */}
        {!isActivated && (
          <>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${i % 2 === 0 ? '#0ea5e9' : '#8b5cf6'}, transparent)`,
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 140,
                    Math.cos(((angle + 360) * Math.PI) / 180) * 140
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 140,
                    Math.sin(((angle + 360) * Math.PI) / 180) * 140
                  ],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.3
                }}
              />
            ))}
          </>
        )}

        {/* Corner Brackets */}
        <div className="absolute inset-4 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-400/60" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-400/60" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-400/60" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-400/60" />
        </div>

        {/* Data Points */}
        <motion.div
          className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Scan className="w-3 h-3 text-cyan-400" />
          <span className="text-xs font-mono text-cyan-400">READY</span>
        </motion.div>

        {/* Status Indicators */}
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className={`w-2 h-2 rounded-full ${isActivated ? 'bg-green-400' : 'bg-cyan-400'}`}
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Activation Feedback - Only shows after click */}
      <AnimatePresence>
        {isActivated && (
          <motion.div
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.p
              className="text-lg font-bold text-green-400 flex items-center gap-2"
              animate={{
                textShadow: ["0 0 10px rgba(34,197,94,0.5)", "0 0 20px rgba(34,197,94,0.8)"]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <CheckCircle className="w-5 h-5" />
              System Activated!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poetic Slogan - Left Side */}
      <motion.div
        className="absolute -left-52 top-1/2 -translate-y-1/2 hidden lg:block"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="text-right space-y-2">
          <motion.p
            className="text-sm font-semibold tracking-wide"
            style={{ fontFamily: "'Orbitron', 'Inter', sans-serif" }}
            animate={{
              opacity: [0.8, 1, 0.8],
              textShadow: [
                '0 0 10px rgba(6,182,212,0.5)',
                '0 0 20px rgba(6,182,212,0.8)',
                '0 0 10px rgba(6,182,212,0.5)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-cyan-300">Guard</span>
            <span className="text-white/90"> What </span>
            <span className="text-cyan-400">Matters.</span>
          </motion.p>
          <motion.p
            className="text-sm font-semibold tracking-wide"
            style={{ fontFamily: "'Orbitron', 'Inter', sans-serif" }}
            animate={{
              opacity: [0.8, 1, 0.8],
              textShadow: [
                '0 0 10px rgba(139,92,246,0.5)',
                '0 0 20px rgba(139,92,246,0.8)',
                '0 0 10px rgba(139,92,246,0.5)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          >
            <span className="text-purple-300">Protect</span>
            <span className="text-white/90"> What </span>
            <span className="text-purple-400">Connects.</span>
          </motion.p>
        </div>
      </motion.div>

      {/* Motivation Words - Right Side */}
      <motion.div
        className="absolute -right-40 top-1/2 -translate-y-1/2 hidden lg:block"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
      >
        <div className="flex flex-col gap-2 text-left">
          <motion.span
            className="text-sm font-bold text-cyan-400/90 tracking-widest"
            animate={{ opacity: [0.6, 1, 0.6], x: [0, 3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}
          >
            DEFEND
          </motion.span>
          <motion.span
            className="text-sm font-bold text-blue-400/90 tracking-widest"
            animate={{ opacity: [0.6, 1, 0.6], x: [0, 3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
          >
            DETECT
          </motion.span>
          <motion.span
            className="text-sm font-bold text-purple-400/90 tracking-widest"
            animate={{ opacity: [0.6, 1, 0.6], x: [0, 3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
          >
            DELIVER
          </motion.span>
        </div>
      </motion.div>

      {/* Floating Tech Labels - Subtle secondary info */}
      <motion.div
        className="absolute -left-20 top-1/2 -translate-y-1/2 lg:top-[70%]"
        animate={{ x: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="flex flex-col gap-2 text-right">
          <span className="text-xs text-cyan-400/60 font-mono">OWASP</span>
          <span className="text-xs text-blue-400/60 font-mono">SSL/TLS</span>
          <span className="text-xs text-purple-400/60 font-mono">CVE</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-20 top-1/2 -translate-y-1/2 lg:top-[70%]"
        animate={{ x: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
      >
        <div className="flex flex-col gap-2 text-left">
          <span className="text-xs text-cyan-400/60 font-mono">AI</span>
          <span className="text-xs text-blue-400/60 font-mono">SCAN</span>
          <span className="text-xs text-purple-400/60 font-mono">PROTECT</span>
        </div>
      </motion.div>
    </div>
  );
};

export default CyberShieldHero;
