import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/Layout";
import { CheckCircle, Shield, ArrowRight, Mail, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import AivedhaAPI from "@/lib/api";
import { logger } from "@/lib/logger";
import { trackPayment, trackSubscription } from "@/lib/analytics";
import { PAYMENT_SUCCESS_REDIRECT_DELAY_MS } from "@/constants/subscription";
import { APP_CONFIG } from "@/config";

interface PlanDetails {
  name: string;
  price: number;
  credits: number;
  currency: string;
  features: string[];
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { refreshSubscription } = useSubscription();
  const [isActivating, setIsActivating] = useState(true);
  const [activationComplete, setActivationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  // Get parameters from URL (PayPal redirect includes these)
  const planCode = searchParams.get("plan") || searchParams.get("plan_code") || "";
  const planName = searchParams.get("plan_name") || "";
  const amount = searchParams.get("amount") || "";
  const currency = searchParams.get("currency") || "USD";
  const subscriptionId = searchParams.get("subscription_id") || "";
  const urlEmail = searchParams.get("email") || searchParams.get("customer_email") || "";
  const urlCredits = searchParams.get("credits") || "";
  const hostedpageId = searchParams.get("hostedpage_id") || "";

  // Fetch plan details from API or use URL params
  useEffect(() => {
    const loadPlanDetails = async () => {
      // First, use URL params if available (PayPal sends these)
      if (planName && amount && urlCredits) {
        setPlanDetails({
          name: planName,
          price: parseFloat(amount),
          credits: parseInt(urlCredits),
          currency: currency,
          features: [
            "AI Gemini 3.0 powered analysis",
            `${urlCredits} security audit credits`,
            "Full OWASP Top 10 scanning",
            "Detailed PDF reports",
            "Security certificates",
            "Email support"
          ]
        });
        return;
      }

      // Otherwise, fetch from API
      try {
        const response = await AivedhaAPI.getPublicPlans();
        if (response.success && response.plans.length > 0) {
          // Extract base plan code (remove _monthly, _yearly suffix)
          const basePlanCode = planCode.toLowerCase().replace(/_monthly|_yearly|_usd/g, '');
          const matchedPlan = response.plans.find(p =>
            p.plan_code.toLowerCase() === basePlanCode ||
            basePlanCode.includes(p.plan_code.toLowerCase())
          );

          if (matchedPlan) {
            setPlanDetails({
              name: matchedPlan.name,
              price: matchedPlan.price,
              credits: matchedPlan.credits,
              currency: matchedPlan.currency,
              features: matchedPlan.features.length > 0 ? matchedPlan.features : [
                "AI Gemini 3.0 powered analysis",
                `${matchedPlan.credits} security audit credits`,
                "Full OWASP Top 10 scanning",
                "Detailed PDF reports",
                "Security certificates",
                "Email support"
              ]
            });
            return;
          }
        }
      } catch (err) {
        logger.warn('Failed to fetch plan from API:', err);
      }

      // Fallback - use whatever URL params we have
      setPlanDetails({
        name: planName || planCode || "Security Plan",
        price: amount ? parseFloat(amount) : 0,
        credits: urlCredits ? parseInt(urlCredits) : 0,
        currency: currency,
        features: [
          "AI Gemini 3.0 powered analysis",
          "Security audit credits",
          "Full OWASP Top 10 scanning",
          "Detailed PDF reports",
          "Security certificates",
          "Email support"
        ]
      });
    };

    loadPlanDetails();
  }, [planCode, planName, amount, urlCredits, currency]);

  // Activate subscription on mount
  useEffect(() => {
    window.scrollTo(0, 0);

    // Clear any pending payment session (payment completed)
    sessionStorage.removeItem('payment_in_progress');

    // Generate unique activation key using transaction ID (PayPal's unique order ID)
    // CRITICAL: Do NOT use Date.now() in fallback - it breaks idempotency on page refresh
    // If no transaction ID, use stable combination of plan+email+amount (will be same across refreshes)
    const activationKey = hostedpageId || subscriptionId || `${planCode}_${urlEmail}_${amount}`.replace(/[^a-zA-Z0-9_@.-]/g, '_');
    const storageKey = `payment_activated_${activationKey}`;

    // Check if already activated (idempotency) - prevent duplicate credits on refresh
    if (sessionStorage.getItem(storageKey)) {
      logger.log("Payment already activated - showing success without re-activating");
      setIsActivating(false);
      setActivationComplete(true);
      toast({
        title: "Already Processed",
        description: "This payment has already been activated. Redirecting to dashboard...",
      });
      // Redirect to dashboard after showing message
      setTimeout(() => navigate("/dashboard"), PAYMENT_SUCCESS_REDIRECT_DELAY_MS);
      return;
    }

    // Also check localStorage for permanent idempotency across sessions
    const permanentKey = `payment_permanent_${hostedpageId || subscriptionId}`;
    if (hostedpageId && localStorage.getItem(permanentKey)) {
      logger.log("Payment permanently marked as activated");
      setIsActivating(false);
      setActivationComplete(true);
      toast({
        title: "Already Processed",
        description: "This payment was already processed. Redirecting to dashboard...",
      });
      setTimeout(() => navigate("/dashboard"), PAYMENT_SUCCESS_REDIRECT_DELAY_MS);
      return;
    }

    activateSubscription(storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activateSubscription = async (storageKey: string) => {
    setIsActivating(true);
    setError(null);
    setActivationError(null);

    try {
      // Get current user
      const userStr = localStorage.getItem("currentUser");
      let userEmail = urlEmail;
      let userName = "";
      let user: Record<string, unknown> = {};

      if (userStr) {
        try {
          user = JSON.parse(userStr);
          userEmail = userEmail || (user.email as string) || "";
          userName = (user.fullName as string) || (user.name as string) || "";
        } catch (e) {
          logger.error("Failed to parse user data:", e);
        }
      }

      if (!userEmail) {
        setError("Unable to identify user. Please log in and try again.");
        setIsActivating(false);
        return;
      }

      // Use URL params for credits and amount - use safe parsing with NaN check
      const parsedCredits = parseInt(urlCredits, 10);
      const creditAmount = !isNaN(parsedCredits) && parsedCredits > 0 ? parsedCredits : (planDetails?.credits || 0);
      const parsedAmount = parseFloat(amount);
      const planAmount = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : (planDetails?.price || 0);

      // CRITICAL: Set lock IMMEDIATELY to prevent race condition with multiple tabs
      const lockKey = `payment_lock_${hostedpageId || subscriptionId}`;
      const existingLock = sessionStorage.getItem(lockKey);
      if (existingLock) {
        logger.warn("Payment activation already in progress (locked)");
        setIsActivating(false);
        setActivationComplete(true);
        toast({
          title: "Processing",
          description: "Payment is being processed in another tab. Please wait...",
        });
        return;
      }
      sessionStorage.setItem(lockKey, new Date().toISOString());

      try {
        const activationResult = await AivedhaAPI.activateSubscription({
          email: userEmail,
          fullName: userName,
          plan: planCode,
          credits: creditAmount,
          amount: planAmount,
          currency: currency,
          paymentMethod: "Card",
          timestamp: new Date().toISOString(),
          hostedpageId: hostedpageId,
          subscriptionId: subscriptionId
        });

        if (activationResult.success) {
          logger.log("Subscription activated:", activationResult);
          sessionStorage.setItem(storageKey, new Date().toISOString());
          // Clear payment_in_progress session to allow new purchases
          sessionStorage.removeItem('payment_in_progress');
          // Store permanent idempotency key to prevent re-activation across sessions
          if (hostedpageId) {
            localStorage.setItem(`payment_permanent_${hostedpageId}`, new Date().toISOString());
          }
          if (subscriptionId) {
            localStorage.setItem(`payment_permanent_${subscriptionId}`, new Date().toISOString());
          }

          // Update localStorage
          const updatedUser = {
            ...user,
            email: userEmail,
            plan: planName || planCode,
            credits: activationResult.user?.credits || creditAmount,
            subscriptionActive: true,
            subscriptionPlan: planCode,
            subscriptionId: subscriptionId || activationResult.user?.subscription_id,
            subscriptionDate: new Date().toISOString(),
            ...(activationResult.user || {})
          };
          localStorage.setItem("currentUser", JSON.stringify(updatedUser));

          // Refresh subscription context to sync credits across app
          await refreshSubscription();

          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (activationResult.already_activated) {
          logger.log("Already activated");
          sessionStorage.setItem(storageKey, new Date().toISOString());
          // Still refresh to ensure credits are synced
          await refreshSubscription();
        } else {
          logger.warn("Activation error:", activationResult);
          setActivationError("Backend sync pending. Please check your dashboard.");
        }
      } catch (apiError) {
        logger.error("Backend activation error:", apiError);
        setActivationError("Backend sync pending. Please check your dashboard or contact support.");
      }

      setActivationComplete(true);

      // Track successful payment in analytics
      trackPayment({
        plan: planDetails?.name || planCode,
        amount: planDetails?.price || parseFloat(amount) || 0,
        currency: planDetails?.currency || currency,
        paymentMethod: 'PayPal',
        subscriptionId: subscriptionId,
      });

      trackSubscription('subscription_activated', planDetails?.name || planCode);

      toast({
        title: "Subscription Activated",
        description: `Welcome to ${planDetails?.name || planCode}. Your account has been upgraded.`,
      });

    } catch (err) {
      logger.error("Activation error:", err);
      setError("There was an issue activating your subscription. Please contact support.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleRetry = () => {
    const activationKey = hostedpageId || subscriptionId || `${planCode}_${urlEmail}_${amount}`;
    const storageKey = `payment_activated_${activationKey}`;
    sessionStorage.removeItem(storageKey);
    activateSubscription(storageKey);
  };

  const formatPrice = (price: number) => {
    return `$${price}`; // USD only globally
  };

  return (
    <Layout>
      <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10"
              >
                {isActivating ? (
                  <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                ) : error ? (
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                ) : (
                  <CheckCircle className="h-10 w-10 text-primary" />
                )}
              </motion.div>

              <h1 className="text-3xl font-bold text-foreground mb-2 font-orbitron">
                {isActivating ? "Activating Your Subscription..." : error ? "Activation Issue" : "Payment Successful!"}
              </h1>
              <p className="text-muted-foreground">
                {isActivating
                  ? "Please wait while we set up your account..."
                  : error
                    ? "We encountered an issue activating your subscription"
                    : `Thank you for subscribing to ${planDetails?.name || planCode}`}
              </p>
            </div>

            {/* Error State */}
            {error && !isActivating && (
              <Card className="bg-card/80 backdrop-blur-md border-red-500/30 mb-6">
                <CardContent className="pt-6">
                  <Alert className="bg-red-500/10 border-red-500/20">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={handleRetry} variant="invertPrimary" size="compact" className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Activation
                    </Button>
                    <Link to="/support" className="flex-1">
                      <Button variant="invertOutline" size="compact">
                        Contact Support
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success Card */}
            {activationComplete && !error && planDetails && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-card/80 backdrop-blur-md border-2 border-primary/30 shadow-lg mb-6">
                  <CardHeader className="text-center">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {planDetails.name}
                      </CardTitle>
                      <Badge className="bg-gradient-to-r from-primary to-primary/70 text-white border-0">
                        Active
                      </Badge>
                    </div>
                    <CardDescription>
                      Your subscription is now active
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Plan Summary */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-muted-foreground">Monthly Price</span>
                        <span className="font-bold text-foreground">
                          {formatPrice(planDetails.price)}/month
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Credits</span>
                        <span className="font-bold text-foreground">{planDetails.credits}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Your Benefits:</h3>
                      {planDetails.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Confirmation Email Notice */}
                    <Alert className="bg-primary/10 border-primary/20">
                      <Mail className="h-4 w-4 text-primary" />
                      <AlertDescription>
                        A confirmation email has been sent to your registered email address with your subscription details.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Backend Sync Warning */}
                {activationError && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/20 mb-4">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                      {activationError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action buttons */}
                <div className="space-y-3">
                  <Link to="/dashboard" className="block">
                    <Button variant="invertPrimary" size="lg" className="h-12 rounded-xl">
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  <Link to="/security-audit" className="block">
                    <Button variant="invertOutline" size="lg" className="h-12 rounded-xl">
                      <Shield className="h-4 w-4 mr-2" />
                      Start Your First Audit
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            {isActivating && (
              <Card className="bg-card/80 backdrop-blur-md border border-border/50">
                <CardContent className="py-12">
                  <div className="text-center">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Setting up your {planDetails?.name || "plan"}...</p>
                    <p className="text-sm text-muted-foreground mt-2">This will only take a moment</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Support Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Need help? Contact us at{" "}
                <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {APP_CONFIG.SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
