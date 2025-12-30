/**
 * ZooZoo Animated Characters Component
 *
 * Two egg-shaped mascot characters performing security audit and
 * cybersecurity protection themed animations.
 *
 * Character 1 (Scanner): Holds a magnifying glass, scanning for vulnerabilities
 * Character 2 (Guardian): Holds a shield, protecting against threats
 */

import { motion } from 'framer-motion';

interface ZooZooCharactersProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isScanning?: boolean;
}

export function ZooZooCharacters({
  className = '',
  size = 'lg',
  isScanning = false
}: ZooZooCharactersProps) {
  const sizeMap = {
    sm: { width: 120, height: 160 },
    md: { width: 160, height: 200 },
    lg: { width: 200, height: 250 }
  };

  const { width, height } = sizeMap[size];

  return (
    <div className={`flex items-end justify-center gap-8 ${className}`}>
      {/* Scanner ZooZoo - Left Character */}
      <motion.svg
        width={width}
        height={height}
        viewBox="0 0 200 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Shadow - use scale transform instead of rx animation to avoid SVG attribute errors */}
        <motion.g
          style={{ transformOrigin: '100px 240px' }}
          animate={{
            scaleX: isScanning ? [1, 1.1, 1] : [1, 1, 1],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse
            cx="100"
            cy="240"
            rx="50"
            ry="8"
            fill="rgba(0,0,0,0.15)"
          />
        </motion.g>

        {/* Body - Egg Shape */}
        <motion.ellipse
          cx="100"
          cy="160"
          rx="55"
          ry="75"
          fill="url(#scannerBodyGradient)"
          stroke="#e5e7eb"
          strokeWidth="2"
          animate={isScanning ? {
            y: [0, -5, 0],
          } : {
            y: [0, -3, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Body Highlight */}
        <ellipse
          cx="85"
          cy="130"
          rx="25"
          ry="35"
          fill="rgba(255,255,255,0.3)"
        />

        {/* Left Eye - use translateX instead of cx animation to avoid SVG attribute errors */}
        <motion.g
          animate={{
            x: isScanning ? [0, 2, -2, 0] : [0, 0, 0, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="80" cy="130" rx="12" ry="14" fill="white" />
          <motion.g
            animate={{
              x: isScanning ? [0, 3, -3, 0] : [0, 0, 0, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx="82" cy="132" r="6" fill="#1f2937" />
          </motion.g>
          <circle cx="84" cy="129" r="2" fill="white" />
        </motion.g>

        {/* Right Eye - use translateX instead of cx animation to avoid SVG attribute errors */}
        <motion.g
          animate={{
            x: isScanning ? [0, 2, -2, 0] : [0, 0, 0, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="120" cy="130" rx="12" ry="14" fill="white" />
          <motion.g
            animate={{
              x: isScanning ? [0, 3, -3, 0] : [0, 0, 0, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx="122" cy="132" r="6" fill="#1f2937" />
          </motion.g>
          <circle cx="124" cy="129" r="2" fill="white" />
        </motion.g>

        {/* Smile - scales slightly when scanning */}
        <motion.path
          d="M85 165 Q100 180 115 165"
          stroke="#1f2937"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ transformOrigin: '100px 170px' }}
          animate={{
            scaleX: isScanning ? [1, 1.1, 1] : [1, 1, 1],
            scaleY: isScanning ? [1, 0.9, 1] : [1, 1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Left Arm holding magnifying glass */}
        <motion.g
          animate={isScanning ? {
            rotate: [0, 15, -10, 0],
            x: [0, 5, -3, 0],
          } : {
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: '55px 160px' }}
        >
          {/* Arm */}
          <ellipse cx="45" cy="170" rx="12" ry="20" fill="url(#scannerBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />

          {/* Hand */}
          <circle cx="40" cy="185" r="10" fill="url(#scannerBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />

          {/* Magnifying Glass Handle */}
          <rect x="25" y="200" width="6" height="25" rx="2" fill="#6b7280" transform="rotate(-30 28 212)" />

          {/* Magnifying Glass Circle */}
          <motion.circle
            cx="15"
            cy="195"
            r="18"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            animate={isScanning ? {
              stroke: ["#3b82f6", "#60a5fa", "#3b82f6"],
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />

          {/* Glass Shine */}
          <circle cx="15" cy="195" r="14" fill="rgba(59, 130, 246, 0.1)" />
          <path d="M8 188 Q15 182 22 188" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" />

          {/* Scan Lines when scanning */}
          {isScanning && (
            <motion.g
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <line x1="5" y1="195" x2="25" y2="195" stroke="#60a5fa" strokeWidth="1" />
              <line x1="15" y1="185" x2="15" y2="205" stroke="#60a5fa" strokeWidth="1" />
            </motion.g>
          )}
        </motion.g>

        {/* Right Arm */}
        <motion.g
          animate={{
            rotate: [0, -3, 3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: '145px 160px' }}
        >
          <ellipse cx="155" cy="170" rx="12" ry="20" fill="url(#scannerBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />
          <circle cx="160" cy="185" r="10" fill="url(#scannerBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />
        </motion.g>

        {/* Feet */}
        <motion.ellipse
          cx="80"
          cy="232"
          rx="18"
          ry="8"
          fill="url(#scannerBodyGradient)"
          stroke="#e5e7eb"
          strokeWidth="1.5"
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        />
        <motion.ellipse
          cx="120"
          cy="232"
          rx="18"
          ry="8"
          fill="url(#scannerBodyGradient)"
          stroke="#e5e7eb"
          strokeWidth="1.5"
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="scannerBodyGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Guardian ZooZoo - Right Character */}
      <motion.svg
        width={width}
        height={height}
        viewBox="0 0 200 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* Shadow - use scale transform instead of rx animation to avoid SVG attribute errors */}
        <motion.g
          style={{ transformOrigin: '100px 240px' }}
          animate={{
            scaleX: [1, 0.96, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse
            cx="100"
            cy="240"
            rx="50"
            ry="8"
            fill="rgba(0,0,0,0.15)"
          />
        </motion.g>

        {/* Body - Egg Shape */}
        <motion.ellipse
          cx="100"
          cy="160"
          rx="55"
          ry="75"
          fill="url(#guardianBodyGradient)"
          stroke="#e5e7eb"
          strokeWidth="2"
          animate={{
            y: [0, -4, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Body Highlight */}
        <ellipse
          cx="115"
          cy="130"
          rx="25"
          ry="35"
          fill="rgba(255,255,255,0.3)"
        />

        {/* Left Eye */}
        <motion.g
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="80" cy="130" rx="12" ry="14" fill="white" />
          <circle cx="80" cy="132" r="6" fill="#1f2937" />
          <circle cx="82" cy="129" r="2" fill="white" />
        </motion.g>

        {/* Right Eye */}
        <motion.g
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        >
          <ellipse cx="120" cy="130" rx="12" ry="14" fill="white" />
          <circle cx="120" cy="132" r="6" fill="#1f2937" />
          <circle cx="122" cy="129" r="2" fill="white" />
        </motion.g>

        {/* Determined Expression */}
        <path
          d="M88 165 Q100 172 112 165"
          stroke="#1f2937"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyebrows - Determined look */}
        <motion.path
          d="M70 118 L90 122"
          stroke="#1f2937"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            y: [0, -1, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.path
          d="M130 118 L110 122"
          stroke="#1f2937"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            y: [0, -1, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Left Arm */}
        <motion.g
          animate={{
            rotate: [0, 3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: '55px 160px' }}
        >
          <ellipse cx="45" cy="170" rx="12" ry="20" fill="url(#guardianBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />
          <circle cx="40" cy="185" r="10" fill="url(#guardianBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />
        </motion.g>

        {/* Right Arm holding shield */}
        <motion.g
          animate={{
            rotate: [0, -8, 0],
            x: [0, 3, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: '145px 160px' }}
        >
          <ellipse cx="155" cy="170" rx="12" ry="20" fill="url(#guardianBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />
          <circle cx="165" cy="185" r="10" fill="url(#guardianBodyGradient)" stroke="#e5e7eb" strokeWidth="1.5" />

          {/* Shield */}
          <motion.g
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path
              d="M175 160 L175 200 Q175 220 195 230 Q215 220 215 200 L215 160 Q195 155 175 160 Z"
              fill="url(#shieldGradient)"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Shield Emblem - Lock */}
            <circle cx="195" cy="185" r="10" fill="#1d4ed8" />
            <rect x="190" y="182" width="10" height="10" rx="2" fill="#dbeafe" />
            <path d="M192 182 L192 178 Q195 174 198 178 L198 182" stroke="#dbeafe" strokeWidth="2" fill="none" />

            {/* Shield Glow when scanning - use scale transform instead of r animation to avoid SVG attribute errors */}
            {isScanning && (
              <motion.g
                style={{ transformOrigin: '195px 195px' }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <circle
                  cx="195"
                  cy="195"
                  r="25"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                />
              </motion.g>
            )}
          </motion.g>
        </motion.g>

        {/* Feet */}
        <motion.ellipse
          cx="80"
          cy="232"
          rx="18"
          ry="8"
          fill="url(#guardianBodyGradient)"
          stroke="#e5e7eb"
          strokeWidth="1.5"
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.ellipse
          cx="120"
          cy="232"
          rx="18"
          ry="8"
          fill="url(#guardianBodyGradient)"
          stroke="#e5e7eb"
          strokeWidth="1.5"
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="guardianBodyGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="shieldGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

export default ZooZooCharacters;
