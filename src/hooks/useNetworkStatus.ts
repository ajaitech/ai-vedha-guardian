import { useState, useEffect, useCallback, useRef } from "react";

// Extend Navigator interface for Network Information API
declare global {
  interface Navigator {
    connection?: {
      type?: string;
      effectiveType?: string;
      saveData?: boolean;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
  }
}

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  lastChecked: Date | null;
  error: string | null;
}

interface NetworkStatusOptions {
  healthCheckUrl?: string;
  healthCheckInterval?: number; // in milliseconds
  enableHealthCheck?: boolean;
}

const DEFAULT_OPTIONS: NetworkStatusOptions = {
  healthCheckUrl: "/api/health",
  healthCheckInterval: 30000, // 30 seconds
  enableHealthCheck: true,
};

export function useNetworkStatus(options: NetworkStatusOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
    lastChecked: null,
    error: null,
  });

  const [isChecking, setIsChecking] = useState(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get network information if available
  const getNetworkInfo = useCallback(() => {
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = navigator.connection;
      if (connection) {
        return {
          connectionType: connection.type || null,
          effectiveType: connection.effectiveType || null,
          isSlowConnection:
            connection.effectiveType === "slow-2g" ||
            connection.effectiveType === "2g" ||
            connection.saveData === true,
        };
      }
    }
    return {
      connectionType: null,
      effectiveType: null,
      isSlowConnection: false,
    };
  }, []);

  // Perform health check
  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    if (!opts.enableHealthCheck || !opts.healthCheckUrl) {
      return navigator.onLine;
    }

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(opts.healthCheckUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      setStatus(prev => ({
        ...prev,
        isOnline: isHealthy,
        lastChecked: new Date(),
        error: isHealthy ? null : `Health check failed: ${response.status}`,
        ...getNetworkInfo(),
      }));

      return isHealthy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isAborted = error instanceof Error && error.name === "AbortError";

      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastChecked: new Date(),
        error: isAborted ? "Health check timeout" : errorMessage,
        ...getNetworkInfo(),
      }));

      return false;
    } finally {
      setIsChecking(false);
    }
  }, [opts.enableHealthCheck, opts.healthCheckUrl, getNetworkInfo]);

  // Manual retry function
  const retry = useCallback(async () => {
    return performHealthCheck();
  }, [performHealthCheck]);

  // Handle online event
  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      error: null,
      lastChecked: new Date(),
      ...getNetworkInfo(),
    }));

    // Verify with health check
    if (opts.enableHealthCheck) {
      performHealthCheck();
    }
  }, [getNetworkInfo, opts.enableHealthCheck, performHealthCheck]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      error: "No internet connection",
      lastChecked: new Date(),
      ...getNetworkInfo(),
    }));
  }, [getNetworkInfo]);

  // Handle connection change
  const handleConnectionChange = useCallback(() => {
    const networkInfo = getNetworkInfo();
    setStatus(prev => ({
      ...prev,
      ...networkInfo,
    }));
  }, [getNetworkInfo]);

  // Set up event listeners and health check interval
  useEffect(() => {
    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Add Network Information API listener if available
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = navigator.connection;
      if (connection && connection.addEventListener) {
        connection.addEventListener("change", handleConnectionChange);
      }
    }

    // Initial network info
    setStatus(prev => ({
      ...prev,
      ...getNetworkInfo(),
    }));

    // Set up periodic health check
    if (opts.enableHealthCheck && opts.healthCheckInterval) {
      healthCheckIntervalRef.current = setInterval(() => {
        if (navigator.onLine) {
          performHealthCheck();
        }
      }, opts.healthCheckInterval);
    }

    // Capture refs for cleanup (refs might change by cleanup time)
    const healthCheckInterval = healthCheckIntervalRef.current;
    const retryTimeout = retryTimeoutRef.current;

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (typeof navigator !== "undefined" && "connection" in navigator) {
        const connection = navigator.connection;
        if (connection && connection.removeEventListener) {
          connection.removeEventListener("change", handleConnectionChange);
        }
      }

      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }

      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, getNetworkInfo, opts.enableHealthCheck, opts.healthCheckInterval, performHealthCheck]);

  return {
    ...status,
    isChecking,
    retry,
    performHealthCheck,
  };
}

export default useNetworkStatus;
