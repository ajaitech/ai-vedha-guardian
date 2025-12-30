import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Wifi, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface OfflineBannerProps {
  className?: string;
  showRetrybutton?: boolean;
  onRetry?: () => void;
}

export function OfflineBanner({
  className = "",
  showRetrybutton = true,
  onRetry,
}: OfflineBannerProps) {
  const { isOnline, isSlowConnection, isChecking, retry, error } = useNetworkStatus({
    enableHealthCheck: true,
    healthCheckInterval: 30000, // Check every 30 seconds (standardized across app)
  });

  const handleRetry = async () => {
    const result = await retry();
    if (result && onRetry) {
      onRetry();
    }
  };

  return (
    <AnimatePresence>
      {/* Offline Banner */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-0 left-0 right-0 z-[100] ${className}`}
        >
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/30 rounded-full">
                  <WifiOff className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">You're offline</p>
                  <p className="text-sm text-red-200">
                    {error || "Please check your internet connection"}
                  </p>
                </div>
              </div>

              {showRetrybutton && (
                <button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isChecking}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Slow Connection Warning */}
      {isOnline && isSlowConnection && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-0 left-0 right-0 z-[100] ${className}`}
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">
                Slow connection detected. Some features may take longer to load.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Connection Restored Toast */}
      {isOnline && !isSlowConnection && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={() => {
            // Auto-hide after 3 seconds
            setTimeout(() => {
              // This will be handled by parent component if needed
            }, 3000);
          }}
          className="hidden" // Hidden by default, shown via CSS when coming back online
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <Wifi className="h-4 w-4" />
              <p className="text-sm font-medium">Connection restored</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline version for forms
export function OfflineIndicator({ className = "" }: { className?: string }) {
  const { isOnline, isChecking, retry } = useNetworkStatus({
    enableHealthCheck: false, // Don't do health checks for inline indicator
  });

  if (isOnline) return null;

  return (
    <div className={`flex items-center gap-2 text-red-500 ${className}`}>
      <WifiOff className="h-4 w-4" />
      <span className="text-sm">Offline</span>
      <button
        onClick={retry}
        disabled={isChecking}
        className="text-xs underline hover:no-underline ml-1"
      >
        {isChecking ? "Checking..." : "Retry"}
      </button>
    </div>
  );
}

export default OfflineBanner;
