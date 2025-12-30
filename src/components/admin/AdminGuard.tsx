/**
 * AdminGuard Component
 *
 * Security guard for admin routes that validates:
 * 1. Subdomain validation (must be admin.aivedha.ai in production)
 * 2. Authentication status (valid admin token)
 * 3. Role-based access control
 * 4. Token expiry validation
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Lock } from 'lucide-react';
import { logger } from '@/lib/logger';

// Admin API base URL
const ADMIN_API_URL = import.meta.env.PROD
  ? 'https://admin-api.aivedha.ai'
  : 'https://admin-api.aivedha.ai';

// Allowed admin subdomains
const ALLOWED_ADMIN_HOSTS = [
  'admin.aivedha.ai',
  'localhost',
  '127.0.0.1',
];

// Valid admin roles
const VALID_ADMIN_ROLES = ['Super Admin', 'Admin', 'Moderator', 'Support'];

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

interface AdminUser {
  admin_user_id: string;
  email: string;
  name: string;
  role: string;
  location?: string;
  status?: string;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'invalid_subdomain' | 'invalid_role';

const AdminGuard: React.FC<AdminGuardProps> = ({ children, requiredRoles }) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const location = useLocation();

  // Check if current host is a valid admin subdomain
  const isValidAdminSubdomain = useCallback((): boolean => {
    const currentHost = window.location.hostname;

    // In development, allow localhost
    if (import.meta.env.DEV) {
      return true;
    }

    // In production, must be admin.aivedha.ai
    return ALLOWED_ADMIN_HOSTS.some(host =>
      currentHost === host || currentHost.endsWith(`.${host}`)
    );
  }, []);

  // Validate admin token with backend
  const validateAdminToken = useCallback(async (): Promise<{ valid: boolean; user?: AdminUser; error?: string }> => {
    const token = localStorage.getItem('adminToken');
    const tokenExpiry = localStorage.getItem('adminTokenExpiry');

    // Check if token exists
    if (!token) {
      return { valid: false, error: 'No authentication token found' };
    }

    // Check if token is expired locally
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
      clearAdminSession();
      return { valid: false, error: 'Session has expired' };
    }

    try {
      // Verify token with backend API
      const response = await fetch(`${ADMIN_API_URL}/admin/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        clearAdminSession();
        return { valid: false, error: 'Token validation failed' };
      }

      const data = await response.json();

      if (!data.success || !data.valid) {
        clearAdminSession();
        return { valid: false, error: data.message || 'Invalid token' };
      }

      // Return user data
      return {
        valid: true,
        user: data.user || JSON.parse(localStorage.getItem('adminUser') || '{}')
      };
    } catch (error) {
      logger.error('Token validation error:', error);

      // On network error, check local token validity as fallback
      // This allows offline access while maintaining security
      const adminUser = localStorage.getItem('adminUser');
      if (adminUser && token && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        return { valid: true, user: JSON.parse(adminUser) };
      }

      return { valid: false, error: 'Unable to verify authentication' };
    }
  }, []);

  // Clear admin session data
  const clearAdminSession = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
  };

  // Check role-based access
  const hasValidRole = (user: AdminUser, requiredRoles?: string[]): boolean => {
    // Check if user has a valid admin role
    if (!VALID_ADMIN_ROLES.includes(user.role)) {
      return false;
    }

    // If specific roles are required, check against them
    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.includes(user.role);
    }

    // Default: any valid admin role is allowed
    return true;
  };

  // Main authentication check
  useEffect(() => {
    const checkAuth = async () => {
      setAuthState('loading');

      // Step 1: Validate subdomain
      if (!isValidAdminSubdomain()) {
        setAuthState('invalid_subdomain');
        setErrorMessage('Admin portal is only accessible via admin.aivedha.ai');
        return;
      }

      // Step 2: Validate token
      const tokenValidation = await validateAdminToken();

      if (!tokenValidation.valid) {
        setAuthState('unauthenticated');
        setErrorMessage(tokenValidation.error || 'Authentication required');
        return;
      }

      // Step 3: Validate role
      if (tokenValidation.user && !hasValidRole(tokenValidation.user, requiredRoles)) {
        setAuthState('invalid_role');
        setErrorMessage('You do not have permission to access this area');
        return;
      }

      // All checks passed
      setAuthState('authenticated');
    };

    checkAuth();
  }, [isValidAdminSubdomain, validateAdminToken, requiredRoles, location.pathname]);

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Shield className="h-12 w-12 text-primary animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Invalid subdomain - show error
  if (authState === 'invalid_subdomain') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <p className="text-sm text-muted-foreground">
            Please access the admin portal via{' '}
            <a
              href="https://admin.aivedha.ai"
              className="text-primary hover:underline font-medium"
            >
              admin.aivedha.ai
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Invalid role - show error
  if (authState === 'invalid_role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Insufficient Permissions</h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <p className="text-sm text-muted-foreground">
            Contact your system administrator for access.
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated - redirect to login
  if (authState === 'unauthenticated') {
    // Store the intended destination for redirect after login
    const returnUrl = location.pathname + location.search;
    return <Navigate to="/admin/login" state={{ from: returnUrl }} replace />;
  }

  // Authenticated - render children
  return <>{children}</>;
};

export default AdminGuard;
