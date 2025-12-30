/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { logger } from '@/lib/logger';

// Session configuration
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes (1 hour) - user preference for long sessions
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const SESSION_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // Warn 5 minutes before expiry

interface User {
  email: string;
  fullName?: string;
  name?: string;
  picture?: string;
  googleId?: string;
  githubId?: string;
  identityId?: string;
  loginMethod?: string;
  credits?: number;
  plan?: string;
}

interface SessionState {
  isAuthenticated: boolean;
  user: User | null;
  sessionExpiresAt: number | null;
  isSessionExpiring: boolean;
  loading: boolean;
}

interface SessionContextType extends SessionState {
  login: (user: User, token?: string) => void;
  logout: () => void;
  refreshSession: () => void;
  updateUser: (updates: Partial<User>) => void;
  getTimeUntilExpiry: () => number;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({
    isAuthenticated: false,
    user: null,
    sessionExpiresAt: null,
    isSessionExpiring: false,
    loading: true,
  });

  // Initialize session from localStorage
  const initializeSession = useCallback(() => {
    try {
      const userStr = localStorage.getItem('currentUser');
      const authToken = localStorage.getItem('authToken');
      const sessionExpiry = localStorage.getItem('sessionExpiresAt');

      if (userStr) {
        const user = JSON.parse(userStr) as User;
        const expiresAt = sessionExpiry ? parseInt(sessionExpiry, 10) : Date.now() + SESSION_TIMEOUT_MS;

        // Check if session is still valid
        if (expiresAt > Date.now()) {
          setState({
            isAuthenticated: true,
            user,
            sessionExpiresAt: expiresAt,
            isSessionExpiring: (expiresAt - Date.now()) < SESSION_WARNING_THRESHOLD_MS,
            loading: false,
          });
          return;
        } else {
          // Session expired - clean up
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('sessionExpiresAt');
        }
      }

      setState({
        isAuthenticated: false,
        user: null,
        sessionExpiresAt: null,
        isSessionExpiring: false,
        loading: false,
      });
    } catch (error) {
      logger.error('Session initialization error:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Login handler - CRITICAL: Clear all previous user data before setting new user
  const login = useCallback((user: User, token?: string) => {
    // SECURITY: Clear ALL previous user data to prevent cross-user data leakage
    const previousUserStr = localStorage.getItem('currentUser');
    if (previousUserStr) {
      try {
        const previousUser = JSON.parse(previousUserStr);
        // If logging in as different user, clear ALL cached data
        if (previousUser.email && previousUser.email.toLowerCase() !== user.email.toLowerCase()) {
          logger.log(`Session: User changed from ${previousUser.email} to ${user.email}, clearing cached data`);
          // Clear subscription cache
          sessionStorage.removeItem('subscription_cache');
          sessionStorage.removeItem('payment_in_progress');
          sessionStorage.removeItem('audit_in_progress');
          sessionStorage.removeItem('current_audit_report_id');
          // Clear any payment activation keys for previous user
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('payment_activated_') || key.startsWith('payment_permanent_')) {
              localStorage.removeItem(key);
            }
          });
          // Clear old onboarding flags
          localStorage.removeItem('showOnboarding');
          localStorage.removeItem('onboardingEmail');
          localStorage.removeItem('onboardingName');
        }
      } catch {
        // Ignore parse errors - clear cache anyway for safety
        sessionStorage.clear();
      }
    }

    const expiresAt = Date.now() + SESSION_TIMEOUT_MS;

    localStorage.setItem('currentUser', JSON.stringify(user));
    if (token) {
      localStorage.setItem('authToken', token);
    }
    localStorage.setItem('sessionExpiresAt', expiresAt.toString());

    setState({
      isAuthenticated: true,
      user,
      sessionExpiresAt: expiresAt,
      isSessionExpiring: false,
      loading: false,
    });
  }, []);

  // Logout handler - MUST be defined before useEffects that use it
  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionExpiresAt');

    setState({
      isAuthenticated: false,
      user: null,
      sessionExpiresAt: null,
      isSessionExpiring: false,
      loading: false,
    });

    // Redirect to login if on protected page
    const protectedPaths = ['/dashboard', '/security-audit', '/profile', '/scheduler'];
    if (protectedPaths.some(path => window.location.pathname.startsWith(path))) {
      window.location.href = '/login';
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Session expiry checker
  useEffect(() => {
    if (!state.isAuthenticated || !state.sessionExpiresAt) return;

    const checkSession = () => {
      const now = Date.now();
      const expiresAt = state.sessionExpiresAt!;

      if (now >= expiresAt) {
        // Session expired
        logout();
      } else if ((expiresAt - now) < SESSION_WARNING_THRESHOLD_MS && !state.isSessionExpiring) {
        // Session expiring soon
        setState(prev => ({ ...prev, isSessionExpiring: true }));
      }
    };

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);
    checkSession(); // Check immediately

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.sessionExpiresAt, state.isSessionExpiring, logout]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser' || e.key === 'authToken') {
        initializeSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initializeSession]);

  // Refresh session (extend expiry)
  const refreshSession = useCallback(() => {
    if (!state.isAuthenticated || !state.user) return;

    const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
    localStorage.setItem('sessionExpiresAt', expiresAt.toString());

    setState(prev => ({
      ...prev,
      sessionExpiresAt: expiresAt,
      isSessionExpiring: false,
    }));
  }, [state.isAuthenticated, state.user]);

  // Update user data
  const updateUser = useCallback((updates: Partial<User>) => {
    if (!state.user) return;

    const updatedUser = { ...state.user, ...updates };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    setState(prev => ({
      ...prev,
      user: updatedUser,
    }));
  }, [state.user]);

  // Get time until session expiry
  const getTimeUntilExpiry = useCallback((): number => {
    if (!state.sessionExpiresAt) return 0;
    return Math.max(0, state.sessionExpiresAt - Date.now());
  }, [state.sessionExpiresAt]);

  // Refresh session on user activity
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const handleActivity = () => {
      // Don't refresh if session is about to expire (let warning show)
      if (!state.isSessionExpiring) {
        refreshSession();
      }
    };

    // Reset session on EVERY user interaction - no throttle for 100% accuracy
    // Session expiry is 60 minutes from last activity
    const activityHandler = () => {
      handleActivity();
    };

    // Listen for user activity - all click and interaction events
    const events = ['mousedown', 'click', 'keydown', 'touchstart', 'touchend', 'scroll', 'wheel', 'focus'];
    events.forEach(event => {
      window.addEventListener(event, activityHandler, { passive: true, capture: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, activityHandler, { capture: true } as EventListenerOptions);
      });
    };
  }, [state.isAuthenticated, state.isSessionExpiring, refreshSession]);

  return (
    <SessionContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshSession,
        updateUser,
        getTimeUntilExpiry,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Utility hook for protected routes
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, loading } = useSession();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);

  return { isAuthenticated, loading };
}
