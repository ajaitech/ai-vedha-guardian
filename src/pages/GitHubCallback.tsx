import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ZooZooLoaderCompact } from "@/components/ZooZooLoader";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
import AivedhaAPI from "@/lib/api";
import ReferralAPI from "@/lib/referral-api";
import { OAUTH_CONFIG, APP_CONFIG } from "@/config";
import { AUTH_ERROR_REDIRECT_DELAY_MS } from "@/constants/subscription";
import { getErrorMessage, hasStatus, getProperty } from "@/utils/type-guards";

const FREE_CREDITS = APP_CONFIG.FREE_CREDITS;
// GitHub redirect URI must match what was sent in the authorization request
const GITHUB_REDIRECT_URI = `${window.location.origin}/auth/github/callback`;

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

export default function GitHubCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login: sessionLogin } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const hasProcessedRef = useRef(false);

  const handleGitHubAuth = useCallback(async (code: string) => {
    try {
      // Exchange code for user data via backend
      const data = await AivedhaAPI.authenticateGitHub(code, GITHUB_REDIRECT_URI);

      // Validate response
      if (!data || !data.email) {
        throw new Error('GitHub authentication failed - invalid response');
      }

      // Extract fields with fallbacks
      const email = data.email;
      const fullName = data.fullName || email.split('@')[0];
      const githubId = data.githubId || '';
      const avatar = data.avatar || '';
      const credits = data.credits;
      const plan = data.plan;
      const isNewUser = data.isNewUser ?? false;
      const token = data.token || '';

      // Create user session
      const user = {
        email,
        fullName,
        picture: avatar,
        githubId,
        loginMethod: 'github',
        credits: isNewUser ? FREE_CREDITS : (credits ?? 0),
        plan: plan || 'Aarambh'
      };

      // Handle referral for new users
      if (isNewUser) {
        const pendingRefCode = localStorage.getItem('pendingReferralCode');
        const pendingRefFrom = localStorage.getItem('pendingReferralFrom');
        if (pendingRefCode) {
          try {
            const refResult = await ReferralAPI.activateReferral(pendingRefCode, email, pendingRefFrom || undefined);
            if (refResult.success) {
              user.credits = (user.credits || 0) + refResult.new_user_credits_added;
              toast({
                title: "Referral Bonus Applied!",
                description: `You received ${refResult.new_user_credits_added} bonus credits!`
              });
            }
          } catch {
            // Referral activation failed
          } finally {
            localStorage.removeItem('pendingReferralCode');
            localStorage.removeItem('pendingReferralFrom');
          }
        }
      }

      // Store session
      sessionLogin(user, token);

      // Send login security alert for ALL logins (security best practice)
      sendLoginNotification(email, fullName, 'GitHub');

      // Show success toast
      toast({
        title: isNewUser ? "Welcome to AiVedha Guard!" : "Welcome back!",
        description: isNewUser
          ? `Your account has been created with ${FREE_CREDITS} free credits!`
          : `Signed in as ${email}`
      });

      // Redirect to dashboard on success
      navigate("/dashboard", { replace: true });

    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const isDuplicateEmail = (hasStatus(error) && error.status === 409) || errorMessage.includes('already registered');

      if (isDuplicateEmail) {
        const existingMethod = getProperty<string>(error, 'existing_method') || 'another account';
        setError(`This email is already registered with ${existingMethod === 'google' ? 'Google' : existingMethod}. Please use that account instead.`);
      } else {
        setError('GitHub authentication failed. Please try again.');
      }

      setProcessing(false);
      // Redirect to login after showing error
      setTimeout(() => navigate('/login'), AUTH_ERROR_REDIRECT_DELAY_MS);
    }
  }, [navigate, toast, sessionLogin]);

  useEffect(() => {
    // Prevent duplicate execution (e.g., in React strict mode)
    if (hasProcessedRef.current) return;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (errorParam) {
      hasProcessedRef.current = true;
      setError(errorDescription || 'GitHub authentication was cancelled or failed.');
      setProcessing(false);
      setTimeout(() => navigate('/login'), AUTH_ERROR_REDIRECT_DELAY_MS);
      return;
    }

    if (!code) {
      hasProcessedRef.current = true;
      setError('No authorization code received from GitHub.');
      setProcessing(false);
      setTimeout(() => navigate('/login'), AUTH_ERROR_REDIRECT_DELAY_MS);
      return;
    }

    // Process the GitHub OAuth callback (mark as processed before async call)
    hasProcessedRef.current = true;
    handleGitHubAuth(code);
  }, [searchParams, navigate, handleGitHubAuth]);

  return (
    <Layout>
      {/* Blurred background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/90 via-purple-900/50 to-slate-900/90 backdrop-blur-sm z-0" />

      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center space-y-4 p-8 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl max-w-sm mx-4">
          {processing ? (
            <ZooZooLoaderCompact message="Signing in with GitHub" />
          ) : error ? (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-foreground font-medium">Authentication Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">Redirecting to login...</p>
            </>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
