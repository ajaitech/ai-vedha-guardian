import { useEffect, useState } from 'react';

/**
 * Fresh ZooZoo Loading Animation
 * Beautiful, smooth loading animation with ZooZoo characters
 * Designed to replace CircularLoader after initial load
 */

interface ZooZooLoadingAnimationProps {
  message?: string;
}

export function ZooZooLoadingAnimation({ message = "Loading" }: ZooZooLoadingAnimationProps) {
  const [dots, setDots] = useState('');
  const [bounce, setBounce] = useState(0);

  // Animate loading dots
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(dotTimer);
  }, []);

  // Bounce animation for ZooZoo characters
  useEffect(() => {
    const bounceTimer = setInterval(() => {
      setBounce(prev => (prev + 1) % 3);
    }, 600);
    return () => clearInterval(bounceTimer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        {/* ZooZoo Characters Container */}
        <div className="relative flex items-end gap-3 h-24">
          {/* ZooZoo Character 1 */}
          <div
            className="relative transition-all duration-300 ease-in-out"
            style={{
              transform: bounce === 0 ? 'translateY(-12px) scale(1.1)' : 'translateY(0) scale(1)',
            }}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/50 relative overflow-hidden">
              {/* Face */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Eyes */}
                <div className="flex gap-2 mb-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                </div>
              </div>
              {/* Shine effect */}
              <div className="absolute top-1 left-1 w-3 h-3 bg-white/40 rounded-full blur-sm" />
            </div>
            {/* Shadow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/20 rounded-full blur-sm" />
          </div>

          {/* ZooZoo Character 2 */}
          <div
            className="relative transition-all duration-300 ease-in-out"
            style={{
              transform: bounce === 1 ? 'translateY(-12px) scale(1.1)' : 'translateY(0) scale(1)',
            }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300 shadow-lg shadow-blue-500/50 relative overflow-hidden">
              {/* Face */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Eyes */}
                <div className="flex gap-2 mb-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
              {/* Shine effect */}
              <div className="absolute top-1 left-1 w-4 h-4 bg-white/40 rounded-full blur-sm" />
            </div>
            {/* Shadow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/20 rounded-full blur-sm" />
          </div>

          {/* ZooZoo Character 3 */}
          <div
            className="relative transition-all duration-300 ease-in-out"
            style={{
              transform: bounce === 2 ? 'translateY(-12px) scale(1.1)' : 'translateY(0) scale(1)',
            }}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-violet-400 to-violet-300 shadow-lg shadow-violet-500/50 relative overflow-hidden">
              {/* Face */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Eyes */}
                <div className="flex gap-2 mb-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>
              </div>
              {/* Shine effect */}
              <div className="absolute top-1 left-1 w-3 h-3 bg-white/40 rounded-full blur-sm" />
            </div>
            {/* Shadow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/20 rounded-full blur-sm" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-semibold text-foreground tracking-wide">
            {message}
            <span className="inline-block w-8 text-left">{dots}</span>
          </p>

          {/* Progress bar */}
          <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-primary via-blue-500 to-violet-500 rounded-full animate-pulse">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent zoozoo-progress-anim" />
            </div>
          </div>

          {/* Fun loading tip */}
          <p className="text-xs text-muted-foreground mt-2 animate-pulse">
            ZooZoo team is preparing your content...
          </p>
        </div>
      </div>
    </div>
  );
}

export default ZooZooLoadingAnimation;
