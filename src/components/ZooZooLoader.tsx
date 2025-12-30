import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircularLoader } from './CircularLoader';

interface ZooZooLoaderProps {
  message?: string;
  showTips?: boolean;
}

const loadingTips = [
  "Scanning security headers...",
  "Analyzing SSL certificates...",
  "Checking for vulnerabilities...",
  "Running AI analysis...",
  "Preparing your dashboard...",
  "Loading audit history...",
  "Syncing your credits...",
  "Almost ready..."
];

/**
 * ZooZoo-style loading animation with cute egg-shaped characters
 * Inspired by the iconic Vodafone ZooZoo mascots
 *
 * DESIGN: Fully transparent background - ONLY ZooZoo characters visible
 * The page content loads in parallel and is visible behind the animation
 */
export function ZooZooLoader({ message, showTips = true }: ZooZooLoaderProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [dots, setDots] = useState('');
  const [isZooZooReady, setIsZooZooReady] = useState(false);

  // Show circular loader first, then ZooZoo animation after brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsZooZooReady(true);
    }, 100); // Small delay to ensure circular loader shows first
    return () => clearTimeout(timer);
  }, []);

  // Rotate through loading tips
  useEffect(() => {
    if (!showTips) return;
    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % loadingTips.length);
    }, 2500);
    return () => clearInterval(tipTimer);
  }, [showTips]);

  // Animate loading dots
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(dotTimer);
  }, []);

  // Render the loader in a portal at document.body level to escape any parent containers
  // This ensures the fixed positioning works correctly across the entire viewport
  const loaderContent = (
    // Semi-transparent overlay with ZooZoo in solid container
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
    >
      {/* Semi-transparent dark overlay - 95% transparent */}
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />

      {/* ZooZoo container - solid background for visibility */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-6 rounded-3xl bg-white/95 dark:bg-gray-900/95 shadow-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">

        {/* ZooZoo Characters Container */}
        <div className="relative w-64 h-48 flex items-end justify-center gap-4">

          {/* Left ZooZoo - Waving */}
          <div className="zoozoo-container zoozoo-bounce-anim drop-shadow-xl">
            <div className="zoozoo-body">
              {/* Body */}
              <div className="w-16 h-24 bg-gradient-to-b from-white via-gray-50 to-gray-100 rounded-[50%] relative shadow-lg border border-gray-300/50">
                {/* Face */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                  {/* Eyes */}
                  <div className="flex gap-3">
                    <div className="w-2.5 h-2.5 bg-gray-800 rounded-full zoozoo-blink-anim" />
                    <div className="w-2.5 h-2.5 bg-gray-800 rounded-full zoozoo-blink-anim" style={{ animationDelay: '0.1s' }} />
                  </div>
                  {/* Mouth - Happy */}
                  <div className="w-3 h-1.5 bg-gray-700 rounded-full mt-1" />
                </div>
              </div>
              {/* Left Arm - Waving */}
              <div className="absolute -left-3 top-10 w-3 h-8 bg-gradient-to-b from-white to-gray-100 rounded-full origin-top zoozoo-wave-anim border border-gray-300/50 shadow-sm" />
              {/* Right Arm */}
              <div className="absolute -right-2 top-12 w-3 h-6 bg-gradient-to-b from-white to-gray-100 rounded-full rotate-12 border border-gray-300/50 shadow-sm" />
              {/* Legs */}
              <div className="absolute -bottom-4 left-2 w-3 h-5 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full border border-gray-300/50 shadow-sm" />
              <div className="absolute -bottom-4 right-2 w-3 h-5 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full border border-gray-300/50 shadow-sm" />
            </div>
          </div>

          {/* Center ZooZoo - Main Character with Shield */}
          <div className="zoozoo-container zoozoo-bounce-anim drop-shadow-xl" style={{ animationDelay: '0.15s' }}>
            <div className="zoozoo-body relative">
              {/* Body - Larger */}
              <div className="w-20 h-28 bg-gradient-to-b from-white via-gray-50 to-gray-100 rounded-[50%] relative shadow-xl border border-gray-300/50">
                {/* Face */}
                <div className="absolute top-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                  {/* Eyes - Bigger, looking up */}
                  <div className="flex gap-4">
                    <div className="w-3 h-3 bg-gray-800 rounded-full relative">
                      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
                    </div>
                    <div className="w-3 h-3 bg-gray-800 rounded-full relative">
                      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
                    </div>
                  </div>
                  {/* Mouth - Smile */}
                  <div className="w-4 h-2 border-2 border-gray-700 border-t-0 rounded-b-full mt-1" />
                </div>
                {/* Blush */}
                <div className="absolute top-12 left-2 w-2.5 h-1.5 bg-pink-200 rounded-full opacity-60" />
                <div className="absolute top-12 right-2 w-2.5 h-1.5 bg-pink-200 rounded-full opacity-60" />
              </div>
              {/* Arms holding shield */}
              <div className="absolute -left-2 top-12 w-3 h-7 bg-gradient-to-b from-white to-gray-100 rounded-full rotate-[-20deg] border border-gray-300/50 shadow-sm" />
              <div className="absolute -right-2 top-12 w-3 h-7 bg-gradient-to-b from-white to-gray-100 rounded-full rotate-[20deg] border border-gray-300/50 shadow-sm" />
              {/* Shield Icon */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 zoozoo-shield-anim">
                <svg className="w-10 h-10 text-primary drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </div>
              {/* Legs */}
              <div className="absolute -bottom-5 left-3 w-3.5 h-6 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full border border-gray-300/50 shadow-sm zoozoo-leg-anim" />
              <div className="absolute -bottom-5 right-3 w-3.5 h-6 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full border border-gray-300/50 shadow-sm zoozoo-leg-anim" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>

          {/* Right ZooZoo - Jumping */}
          <div className="zoozoo-container zoozoo-jump-anim drop-shadow-xl" style={{ animationDelay: '0.3s' }}>
            <div className="zoozoo-body">
              {/* Body */}
              <div className="w-14 h-20 bg-gradient-to-b from-white via-gray-50 to-gray-100 rounded-[50%] relative shadow-lg border border-gray-300/50">
                {/* Face */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                  {/* Eyes - Excited */}
                  <div className="flex gap-2.5">
                    <div className="w-2 h-3 bg-gray-800 rounded-full" />
                    <div className="w-2 h-3 bg-gray-800 rounded-full" />
                  </div>
                  {/* Mouth - O shape (excited) */}
                  <div className="w-2.5 h-2.5 bg-gray-700 rounded-full mt-0.5" />
                </div>
              </div>
              {/* Arms up */}
              <div className="absolute -left-3 top-4 w-2.5 h-7 bg-gradient-to-b from-white to-gray-100 rounded-full rotate-[-30deg] border border-gray-300/50 shadow-sm" />
              <div className="absolute -right-3 top-4 w-2.5 h-7 bg-gradient-to-b from-white to-gray-100 rounded-full rotate-[30deg] border border-gray-300/50 shadow-sm" />
              {/* Legs */}
              <div className="absolute -bottom-3 left-2 w-2.5 h-4 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full rotate-[-10deg] border border-gray-300/50 shadow-sm" />
              <div className="absolute -bottom-3 right-2 w-2.5 h-4 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full rotate-[10deg] border border-gray-300/50 shadow-sm" />
            </div>
          </div>

          {/* Floating particles around */}
          <div className="absolute top-0 left-8 w-2 h-2 bg-primary/60 rounded-full zoozoo-float-anim shadow-lg" />
          <div className="absolute top-4 right-10 w-1.5 h-1.5 bg-primary/50 rounded-full zoozoo-float-anim shadow-md" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 left-4 w-1 h-1 bg-primary/40 rounded-full zoozoo-float-anim shadow-sm" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-24 right-6 w-2 h-2 bg-primary/50 rounded-full zoozoo-float-anim shadow-md" style={{ animationDelay: '0.7s' }} />
        </div>

        {/* Loading Text - with text shadow for readability on any background */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold flex items-center justify-center gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            <span className="text-primary">
              {message || 'Loading'}
            </span>
            <span className="w-8 text-left text-primary">{dots}</span>
          </h3>

          {showTips && (
            <p className="text-sm font-medium text-foreground/80 zoozoo-fade-anim min-h-[20px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" key={tipIndex}>
              {loadingTips[tipIndex]}
            </p>
          )}
        </div>

        {/* Progress bar - minimal, floating */}
        <div className="w-40 h-1 bg-gray-300/50 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full zoozoo-progress-anim shadow-lg" />
        </div>
      </div>
    </div>
  );

  // Show lightweight circular loader first, then transition to ZooZoo animation
  if (!isZooZooReady) {
    return <CircularLoader message={message} />;
  }

  // Use portal to render at document.body level, escaping any parent container constraints
  return createPortal(loaderContent, document.body);
}

/**
 * Compact ZooZoo loader for inline/smaller contexts
 */
export function ZooZooLoaderCompact({ message }: { message?: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Single ZooZoo - no background */}
      <div className="zoozoo-bounce-anim drop-shadow-xl">
        <div className="w-12 h-16 bg-gradient-to-b from-white via-gray-50 to-gray-100 rounded-[50%] relative shadow-lg border border-gray-300/50">
          {/* Face */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
              <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
            </div>
            <div className="w-2 h-1 bg-gray-700 rounded-full mt-0.5" />
          </div>
        </div>
      </div>

      <p className="text-sm font-medium text-foreground/80 flex items-center drop-shadow-sm">
        <span>{message || 'Loading'}</span>
        <span className="w-6 text-left">{dots}</span>
      </p>
    </div>
  );
}

export default ZooZooLoader;
