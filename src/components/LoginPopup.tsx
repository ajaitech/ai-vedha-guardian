import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Loader2, Gift, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
import { CognitoAuth } from "@/lib/cognito";
import AivedhaAPI from "@/lib/api";
import { OAUTH_CONFIG, APP_CONFIG } from "@/config";
import { getErrorMessage, hasStatus, getProperty } from "@/utils/type-guards";

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: string;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
              logo_alignment?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const FREE_CREDITS = APP_CONFIG.FREE_CREDITS;
const GOOGLE_CLIENT_ID = OAUTH_CONFIG.GOOGLE_CLIENT_ID;
const GITHUB_CLIENT_ID = OAUTH_CONFIG.GITHUB_CLIENT_ID;
const GITHUB_REDIRECT_URI = OAUTH_CONFIG.GITHUB_REDIRECT_URI;

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface LoginPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function LoginPopup({ isOpen, onClose, onLoginSuccess }: LoginPopupProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login: sessionLogin } = useSession();

  // Send login notification email
  const sendLoginNotification = async (email: string, fullName: string, loginMethod: string) => {
    try {
      await AivedhaAPI.sendLoginNotification({
        email,
        fullName,
        loginMethod,
        loginTime: new Date().toLocaleString()
      });
    } catch {
      // Login notification email deferred
    }
  };

  // Handle Google Sign-In response
  const handleGoogleResponse = useCallback(async (response: GoogleCredentialResponse) => {
    setGoogleLoading(true);
    try {
      const googleToken = response.credential;
      const payload = JSON.parse(atob(googleToken.split('.')[1])) as { email: string; name: string; picture: string; sub: string };
      const { email, name, picture, sub: googleId } = payload;

      const cognitoResult = await CognitoAuth.loginWithGoogle(googleToken);
      if (!cognitoResult.success) {
        throw new Error('Token validation failed');
      }

      const user: {
        email: string;
        fullName: string;
        picture: string;
        googleId: string;
        identityId?: string;
        loginMethod: string;
        credits?: number;
        plan?: string;
      } = {
        email,
        fullName: name,
        picture,
        googleId,
        identityId: cognitoResult.identityId,
        loginMethod: 'google'
      };

      localStorage.setItem("authToken", googleToken);

      let isNewUser = false;
      try {
        const creditsData = await AivedhaAPI.getUserCredits(email);
        user.credits = creditsData.credits !== undefined ? (typeof creditsData.credits === 'number' ? creditsData.credits : 0) : 0;
        user.plan = creditsData.plan || 'Aarambh';
      } catch {
        user.credits = 0;
        user.plan = 'Aarambh';
      }

      try {
        const data = await AivedhaAPI.registerGoogleUser({
          email,
          fullName: name,
          googleId,
          picture,
          identityId: cognitoResult.identityId,
          isNewUser,
          defaultCredits: isNewUser ? FREE_CREDITS : undefined
        });

        if (data.credits !== undefined) user.credits = data.credits;
        if (data.plan) user.plan = data.plan;
        if (data.isNewUser !== undefined) isNewUser = data.isNewUser;
      } catch {
        // Backend registration deferred
      }

      if (isNewUser) {
        try {
          await AivedhaAPI.createCheckoutSession({
            planCode: "aarambh_free",
            currency: "USD",
            billingCycle: "monthly",
            email: email,
            fullName: name || email.split('@')[0]
          });
        } catch {
          // Free plan activation deferred
        }
      }

      sessionLogin(user, googleToken);

      // Send login security alert for ALL logins (security best practice)
      sendLoginNotification(email, name, 'Google');

      toast({
        title: isNewUser ? "Welcome to AiVedha Guard!" : "Welcome back!",
        description: isNewUser
          ? `Your account has been created with ${FREE_CREDITS} free credits. Start your first security audit!`
          : `Signed in as ${email}`
      });

      onClose();
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const isDuplicateEmail = (hasStatus(error) && error.status === 409) || errorMessage.includes('already registered');

      if (isDuplicateEmail) {
        const existingMethod = getProperty<string>(error, 'existing_method') || 'another account';
        toast({
          variant: "destructive",
          title: "Email Already Registered",
          description: `This email is already registered. Please sign in using your original ${existingMethod === 'github' ? 'GitHub' : existingMethod === 'email' ? 'email/password' : existingMethod} account.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: "Unable to authenticate. Please try again."
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, toast, onClose, onLoginSuccess, sessionLogin]);

  // Load Google Identity Services
  useEffect(() => {
    if (!isOpen) return;

    if (document.getElementById('google-gsi-script')) {
      setGoogleScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleScriptLoaded(true);
    document.body.appendChild(script);
  }, [isOpen]);

  // Initialize Google Sign-In when script is loaded
  useEffect(() => {
    if (!isOpen || !googleScriptLoaded || !window.google) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      });

      const googleBtnContainer = document.getElementById('google-signin-btn-popup');
      if (googleBtnContainer) {
        window.google.accounts.id.renderButton(googleBtnContainer, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    } catch {
      // Google Sign-In initialization deferred
    }
  }, [isOpen, googleScriptLoaded, handleGoogleResponse]);

  // Handle GitHub Sign-In
  const handleGitHubSignIn = () => {
    setGithubLoading(true);
    // Store that we came from popup so we can redirect properly after GitHub callback
    sessionStorage.setItem('loginSource', 'popup');
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=user:email&state=github_oauth`;
    window.location.href = githubAuthUrl;
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay - z-[200] front-most layer, 80% transparent */}
      <div
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tile-based widget popup - z-[201] above backdrop, centered, responsive */}
      <div className="fixed left-1/2 top-1/2 z-[201] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[380px] sm:max-w-[400px] animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200">
        <div className="bg-card/95 backdrop-blur-xl border-2 border-primary/30 shadow-2xl shadow-primary/20 rounded-2xl p-4 sm:p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2 pb-3 border-b border-border/30">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Quick Sign In</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to start your security audit
            </p>

            {/* Free Credits Banner */}
            <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                New users get {FREE_CREDITS} free credits!
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            {/* Social Login buttons - Square App Icons in Same Row */}
            <div className="flex items-center justify-center gap-4">
              {/* Google Sign-In Square button */}
              <div className="flex flex-col items-center gap-2">
                {googleLoading ? (
                  <div className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center shadow-md">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                  </div>
                ) : !googleScriptLoaded ? (
                  <div className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center shadow-md">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.google?.accounts?.id) {
                        window.google.accounts.id.prompt();
                      }
                    }}
                    className="relative w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 group"
                    aria-label="Sign in with Google"
                  >
                    {/* Google colorful border - blue/red/yellow/green gradient */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-red-500 via-yellow-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[spin_3s_linear_infinite]" style={{ padding: '2px' }}>
                      <div className="w-full h-full bg-white rounded-[10px]"></div>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-500/50 via-red-500/50 via-yellow-500/50 to-green-500/50 opacity-0 group-hover:opacity-60 blur-md transition-opacity duration-300"></div>
                    {/* Border */}
                    <div className="absolute inset-0 rounded-xl border-2 border-gray-200 group-hover:border-transparent transition-colors duration-300"></div>
                    <svg className="w-7 h-7 relative z-10" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                )}
                <span className="text-xs text-muted-foreground font-medium">Google</span>
              </div>

              {/* Hidden Google button container for SDK */}
              <div id="google-signin-btn-popup" className="hidden"></div>

              {/* GitHub Sign-In Square button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleGitHubSignIn}
                  disabled={githubLoading}
                  className="relative w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 group"
                  aria-label="Sign in with GitHub"
                >
                  {/* GitHub purple/pink gradient border */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[spin_3s_linear_infinite]" style={{ padding: '2px' }}>
                    <div className="w-full h-full bg-gray-900 rounded-[10px]"></div>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50 opacity-0 group-hover:opacity-60 blur-md transition-opacity duration-300"></div>
                  {/* Border */}
                  <div className="absolute inset-0 rounded-xl border-2 border-gray-700 group-hover:border-transparent transition-colors duration-300"></div>
                  {githubLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white relative z-10" />
                  ) : (
                    <svg className="h-7 w-7 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-muted-foreground font-medium">GitHub</span>
              </div>
            </div>

            {/* Processing indicator */}
            {(googleLoading || githubLoading) && (
              <div className="flex justify-center py-1">
                <p className="text-xs text-muted-foreground animate-pulse">
                  Authenticating...
                </p>
              </div>
            )}

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              By signing in, you agree to our{" "}
              <Link
                to="/terms"
                onClick={onClose}
                className="text-primary hover:underline font-medium"
              >
                Terms of Service
              </Link>{" "}
              &{" "}
              <Link
                to="/privacy"
                onClick={onClose}
                className="text-primary hover:underline font-medium"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPopup;
