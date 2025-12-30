// Google OAuth authentication handler
// Simplified authentication without Cognito Identity Pool dependency

import { logger } from './logger';

export class CognitoAuth {
  /**
   * Login with Google OAuth token
   * @param googleToken - The ID token from Google Sign-In
   * @returns Promise with success status
   */
  static async loginWithGoogle(googleToken: string) {
    try {
      // Decode the JWT to validate and extract user info
      const parts = googleToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      // Validate token has required fields
      if (!payload.email || !payload.sub) {
        throw new Error('Invalid token payload');
      }

      // Check token expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }

      // Generate a unique identity ID from Google's sub (subject) claim
      const identityId = `google-${payload.sub}`;

      return {
        success: true,
        identityId: identityId,
        credentials: {
          accessToken: googleToken,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 3600000)
        }
      };
    } catch (error) {
      logger.error('Google login error:', error);
      return { success: false, error };
    }
  }

  /**
   * Get current identity credentials (for authenticated users)
   * @param identityId - The identity ID
   * @param googleToken - The Google token (optional, for refresh)
   */
  static async getCredentials(identityId: string, googleToken?: string) {
    try {
      if (!googleToken) {
        // Try to get from localStorage
        googleToken = localStorage.getItem('authToken') || undefined;
      }

      if (!googleToken) {
        throw new Error('No token available');
      }

      return {
        success: true,
        credentials: {
          accessToken: googleToken,
          identityId: identityId
        }
      };
    } catch (error) {
      logger.error('Error getting credentials:', error);
      return { success: false, error };
    }
  }

  /**
   * Logout - Clear local auth state
   */
  static logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    return !!(token && user);
  }

  /**
   * Get current user
   */
  static getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}
