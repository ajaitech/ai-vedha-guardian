import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedSecurityLockProps {
  onUnlock?: () => void;
  onOpenLoginPopup?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const AnimatedSecurityLock = ({
  onUnlock,
  onOpenLoginPopup,
  size = "lg",
  className = ""
}: AnimatedSecurityLockProps) => {
  const navigate = useNavigate();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { container: "w-24 h-24", lock: "w-10 h-10", shackle: "h-5", text: "text-xs" },
    md: { container: "w-32 h-32", lock: "w-14 h-14", shackle: "h-7", text: "text-sm" },
    lg: { container: "w-44 h-44", lock: "w-20 h-20", shackle: "h-10", text: "text-base" }
  };

  const config = sizeConfig[size];

  const handleClick = useCallback(() => {
    if (isUnlocking || isUnlocked) return;

    // Start unlock animation
    setIsUnlocking(true);
    setShowRipple(true);

    // Haptic feedback simulation (vibration if supported)
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    // Play unlock sequence
    setTimeout(() => {
      setIsUnlocked(true);

      // Navigate after animation completes
      setTimeout(() => {
        // Check if user is logged in
        const userStr = localStorage.getItem("currentUser");
        if (userStr) {
          // User is logged in - go to audit page
          navigate("/security-audit");
        } else {
          // User not logged in - open login popup if callback provided, otherwise navigate
          if (onOpenLoginPopup) {
            onOpenLoginPopup();
            // Reset lock state for next use
            setTimeout(() => {
              setIsUnlocking(false);
              setIsUnlocked(false);
            }, 500);
          } else {
            navigate("/login");
          }
        }

        if (onUnlock) onUnlock();
      }, 800);
    }, 600);
  }, [isUnlocking, isUnlocked, navigate, onUnlock, onOpenLoginPopup]);

  return (
    <div className={`relative ${className}`}>
      {/* Outer Glow Ring */}
      <motion.div
        className={`absolute inset-0 ${config.container} rounded-full`}
        animate={{
          boxShadow: isUnlocked
            ? [
                "0 0 0 0 rgba(34, 197, 94, 0)",
                "0 0 0 30px rgba(34, 197, 94, 0)"
              ]
            : [
                "0 0 30px 5px rgba(34, 211, 238, 0.3)",
                "0 0 60px 10px rgba(34, 211, 238, 0.5)",
                "0 0 30px 5px rgba(34, 211, 238, 0.3)"
              ]
        }}
        transition={{
          duration: isUnlocked ? 0.5 : 2,
          repeat: isUnlocked ? 0 : Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Ripple Effect on Click */}
      <AnimatePresence>
        {showRipple && (
          <motion.div
            className={`absolute inset-0 ${config.container} rounded-full border-2 border-cyan-400`}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onAnimationComplete={() => setShowRipple(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Lock button */}
      <motion.button
        className={`
          relative ${config.container} rounded-full cursor-pointer
          flex flex-col items-center justify-center
          bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800
          border-2 transition-all duration-300
          focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/50
          ${isUnlocked
            ? 'border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.4)]'
            : isPressed
              ? 'border-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.6)] scale-95'
              : 'border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]'
          }
        `}
        onClick={handleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        whileHover={{ scale: isUnlocking ? 1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          rotateY: isUnlocked ? [0, 10, -10, 0] : 0
        }}
        transition={{ duration: 0.5 }}
        aria-label={isUnlocked ? "Lock opened - navigating..." : "Click to unlock security audit"}
      >
        {/* Inner Glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-700/50 to-transparent" />

        {/* Lock Icon Container */}
        <div className="relative flex flex-col items-center">
          {/* Shackle (top part of lock) */}
          <motion.div
            className={`relative ${config.shackle} mb-0`}
            animate={{
              y: isUnlocked ? -8 : 0,
              rotate: isUnlocked ? -25 : 0,
              originX: 0,
              originY: 1
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <svg
              viewBox="0 0 24 14"
              className={`w-full h-full ${isUnlocked ? 'text-green-400' : 'text-cyan-400'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <motion.path
                d="M5 14 V8 A7 7 0 0 1 19 8 V14"
                animate={{
                  d: isUnlocked
                    ? "M5 14 V8 A7 7 0 0 1 19 8 V8"
                    : "M5 14 V8 A7 7 0 0 1 19 8 V14"
                }}
                transition={{ duration: 0.4 }}
              />
            </svg>
          </motion.div>

          {/* Lock Body */}
          <motion.div
            className={`
              ${config.lock} rounded-lg relative
              flex items-center justify-center
              ${isUnlocked
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600'
              }
            `}
            animate={{
              scale: isUnlocking && !isUnlocked ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 0.3 }}
            style={{
              boxShadow: isUnlocked
                ? "0 0 30px rgba(34, 197, 94, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)"
                : "0 0 20px rgba(34, 211, 238, 0.3), inset 0 2px 4px rgba(255,255,255,0.2)"
            }}
          >
            {/* Keyhole */}
            <motion.div
              className="relative"
              animate={{
                scale: isUnlocking && !isUnlocked ? [1, 1.5, 1] : 1,
                opacity: isUnlocked ? 0 : 1
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-3 h-3 rounded-full bg-slate-900/80" />
              <div className="w-1.5 h-3 bg-slate-900/80 mx-auto -mt-0.5 rounded-b" />
            </motion.div>

            {/* Checkmark (appears when unlocked) */}
            <AnimatePresence>
              {isUnlocked && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <motion.svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10 text-white"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <motion.path
                      d="M5 12l5 5L19 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </motion.svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Pulsing Ring */}
        {!isUnlocked && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Sparkle particles */}
        {!isUnlocked && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`
                }}
                animate={{
                  y: [0, -15, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.4
                }}
              />
            ))}
          </>
        )}
      </motion.button>

      {/* Text Label */}
      <motion.div
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
        animate={{
          y: isPressed ? 2 : 0
        }}
      >
        <motion.p
          className={`${config.text} font-semibold text-center`}
          animate={{
            color: isUnlocked ? "#4ade80" : "#22d3ee"
          }}
        >
          {isUnlocked ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
              Unlocked!
            </motion.span>
          ) : (
            <motion.span
              animate={{
                scale: [1, 1.05, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex items-center gap-2"
            >
              <motion.span
                animate={{
                  y: [0, -3, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </motion.span>
              Click to Unlock
            </motion.span>
          )}
        </motion.p>
      </motion.div>

      {/* Touch hint for mobile */}
      {!isUnlocked && (
        <motion.div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 2 }}
        >
          <p className="text-xs text-slate-400 whitespace-nowrap">
            Tap to start your security journey
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AnimatedSecurityLock;
