import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { APP_CONFIG } from "@/config";
import {
  Shield,
  Lock,
  CheckCircle,
  Globe,
  Coins,
  LogIn,
  AlertTriangle,
  CreditCard,
  Loader2,
  Check,
  ArrowLeft,
  FileText,
  Zap,
  Building2,
  Trash2,
} from "lucide-react";
import { CouponInput } from "@/components/pricing/CouponInput";
import { WhiteLabelModal } from "@/components/WhiteLabelModal";
import { OrderSummary, type CouponInfo } from "@/components/OrderSummary";
import { useToast } from "@/hooks/use-toast";
import { getPlanById, type Plan, PLANS } from "@/constants/plans";
import { getAddonById, type Addon, RECURRING_ADDONS } from "@/constants/addons";
import { usePricing } from "@/hooks/usePricing";
import { BillingToggle } from "@/components/pricing/BillingToggle";
import AivedhaAPI from "@/lib/api";
import { logger } from "@/lib/logger";
import { getAnimatedPlanIcon } from "@/components/AnimatedPlanIcons";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { isValidEmail, isValidPhone, sanitizePhoneInput } from "@/utils/validation";
import { detectCountryCodeFromTimezone } from "@/constants/timezones";

// Type definitions for API responses
interface CheckoutResponse {
  success?: boolean;
  hostedPageUrl?: string;
  checkout_url?: string; // Legacy field for backwards compatibility
  error?: string;
  message?: string;
  free_order?: boolean;
  credits_added?: number;
  credits?: number;
}

interface ApiError extends Error {
  error?: string;
  status?: number;
}

// Generate unique transaction ID for idempotency
const generateTransactionId = () => {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Cart persistence keys
const CART_STORAGE_KEY = 'aivedha_checkout_cart';

interface UserData {
  email: string;
  fullName?: string;
  name?: string;
  credits?: number | string;
  plan?: string;
  identityId?: string;
}

export default function Purchase() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Get plan from URL
  const planParam = searchParams.get("plan");
  const currencyParam = searchParams.get("currency") as "USD" | null;
  const billingParam = searchParams.get("billing") as "monthly" | "yearly" | null;
  const typeParam = searchParams.get("type"); // 'credits' for credit pack purchase
  const packParam = searchParams.get("pack"); // credit pack id

  const {
    currency,
    setCurrency,
    billingCycle,
    setBillingCycle,
    couponCode,
    couponDiscount,
    couponType,
    couponError,
    validatingCoupon,
    validateCoupon,
    clearCoupon,
    getPlanPrice,
    getOriginalPrice,
    formatPrice,
    getAddonPrice,
    creditPacks,
    isOverseas,
    profileCurrencyLoaded,
  } = usePricing();

  // Get current subscription to disable active plan button
  const { currentPlan: userCurrentPlan, subscriptionStatus } = useSubscription();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [countryCode, setCountryCode] = useState(() => {
    // Load saved country code from localStorage
    return localStorage.getItem("aivedha_country_code") || "+91";
  });
  const [formData, setFormData] = useState(() => {
    // Load saved phone from localStorage
    const savedPhone = localStorage.getItem("aivedha_phone") || "";
    return {
      email: "",
      fullName: "",
      phone: savedPhone,
    };
  });

  // Auto-detect country code based on timezone
  useEffect(() => {
    const detectedCode = detectCountryCodeFromTimezone();
    setCountryCode(detectedCode);
  }, [currency]);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedCreditPack, setSelectedCreditPack] = useState<Addon | { id: string; credits: number; price: number; savings: number } | null>(null);
  const [purchaseType, setPurchaseType] = useState<"subscription" | "credits">("subscription");

  // WhiteLabel addon state
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showWhiteLabelModal, setShowWhiteLabelModal] = useState(false);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<{ brandName: string; domain: string } | null>(null);
  const hasWhiteLabelAddon = selectedAddons.includes("White-Label Reports");

  // Transaction tracking
  const [clientTransactionId] = useState(() => generateTransactionId());

  // Memoized coupon info for OrderSummary
  const couponInfo: CouponInfo | null = useMemo(() => {
    if (!couponCode || couponDiscount <= 0) return null;
    return {
      code: couponCode,
      discountPercent: couponType === "percentage" ? couponDiscount : 0,
      discountAmount: couponType === "percentage"
        ? (getFinalPrice() * couponDiscount / 100)
        : couponDiscount,
      type: couponType === "percentage" ? "percent" : "fixed",
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, couponDiscount, couponType]);

  // Save cart to sessionStorage when items change
  useEffect(() => {
    if (selectedPlan || selectedCreditPack || selectedAddons.length > 0) {
      const cartData = {
        planId: selectedPlan?.id,
        creditPackId: selectedCreditPack?.id,
        addons: selectedAddons,
        billingCycle,
        whiteLabelConfig,
        couponCode,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
    }
  }, [selectedPlan, selectedCreditPack, selectedAddons, billingCycle, whiteLabelConfig, couponCode]);

  // Restore cart from sessionStorage on mount (if no URL params)
  useEffect(() => {
    if (!planParam && !typeParam) {
      const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart);
          // Only restore if cart is less than 30 minutes old
          if (Date.now() - cartData.timestamp < 30 * 60 * 1000) {
            if (cartData.planId) {
              const plan = getPlanById(cartData.planId);
              if (plan) {
                setSelectedPlan(plan);
                setPurchaseType("subscription");
              }
            }
            if (cartData.creditPackId) {
              const pack = getAddonById(cartData.creditPackId);
              if (pack) {
                setSelectedCreditPack(pack);
                setPurchaseType("credits");
              }
            }
            if (cartData.addons?.length > 0) {
              setSelectedAddons(cartData.addons);
            }
            if (cartData.billingCycle) {
              setBillingCycle(cartData.billingCycle);
            }
            if (cartData.whiteLabelConfig) {
              setWhiteLabelConfig(cartData.whiteLabelConfig);
            }
          } else {
            // Clear stale cart
            sessionStorage.removeItem(CART_STORAGE_KEY);
          }
        } catch (error) {
          logger.warn('Failed to restore cart from session:', error);
          sessionStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    }
  }, [planParam, typeParam]);

  // Disable exhaustive-deps warning for getPlanById, getAddonById, setBillingCycle
  // These are stable functions/setters that don't need to be in deps

  // Initialize from URL params
  useEffect(() => {
    window.scrollTo(0, 0);

    // Only set currency from URL if user is NOT overseas (overseas users are locked to USD)
    if (currencyParam && !isOverseas) setCurrency(currencyParam);
    if (billingParam) setBillingCycle(billingParam);

    // Parse addons from URL
    const addonsParam = searchParams.get("addons");
    if (addonsParam) {
      setSelectedAddons(addonsParam.split(","));
    }

    // Determine purchase type
    if (typeParam === "credits" && packParam) {
      setPurchaseType("credits");
      // First try dynamic creditPacks, then fallback to static getAddonById
      const pack = creditPacks.find(p => p.id === packParam) || getAddonById(packParam);
      if (pack) setSelectedCreditPack(pack);
    } else if (planParam) {
      setPurchaseType("subscription");
      // Parse plan from URL (e.g., suraksha_monthly, raksha_yearly_usd)
      const planId = planParam.replace(/_monthly|_yearly|_usd/g, "");
      const plan = getPlanById(planId);
      if (plan) setSelectedPlan(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planParam, currencyParam, billingParam, typeParam, packParam, searchParams, creditPacks, isOverseas]);

  // Check authentication and fetch phone from user profile
  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAuthenticated(true);
        setCurrentUser(user);
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
          fullName: user.fullName || user.name || "",
        }));

        // Fetch phone from user profile (saved from previous purchases)
        if (user.email) {
          AivedhaAPI.getUserProfile(user.email)
            .then((profile) => {
              if (profile?.phone) {
                // Extract just the phone number part (without country code if present)
                let phoneNumber = profile.phone;
                // If phone starts with country code, try to extract it
                const countryCodeMatch = phoneNumber.match(/^(\+\d{1,4})/);
                if (countryCodeMatch) {
                  const detectedCode = countryCodeMatch[1];
                  phoneNumber = phoneNumber.replace(detectedCode, '').trim();
                  setCountryCode(detectedCode);
                  localStorage.setItem("aivedha_country_code", detectedCode);
                }
                setFormData((prev) => ({
                  ...prev,
                  phone: phoneNumber || prev.phone,
                }));
                localStorage.setItem("aivedha_phone", phoneNumber);
              }
            })
            .catch((error) => {
              // Profile fetch failed, use localStorage fallback
              logger.warn('Failed to fetch user profile for phone number:', error);
            });
        }
      } catch (error) {
        logger.error('Failed to parse user data from localStorage:', error);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Sanitize phone number input using validation utility
    if (name === "phone") {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({
        ...prev,
        [name]: sanitized,
      }));
      // Persist phone number to localStorage for auto-populate
      if (sanitized) {
        localStorage.setItem("aivedha_phone", sanitized);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Persist country code to localStorage
  const handleCountryCodeChange = (code: string) => {
    setCountryCode(code);
    localStorage.setItem("aivedha_country_code", code);
  };

  // Calculate final price
  const getFinalPrice = (): number => {
    if (purchaseType === "credits" && selectedCreditPack) {
      // Use the price directly from the addon object
      return selectedCreditPack.price;
    }
    if (selectedPlan) {
      return getPlanPrice(selectedPlan);
    }
    return 0;
  };

  const getOriginalPriceValue = (): number => {
    if (purchaseType === "credits" && selectedCreditPack) {
      // Use the price directly from the addon object
      return selectedCreditPack.price;
    }
    if (selectedPlan) {
      return getOriginalPrice(selectedPlan);
    }
    return 0;
  };

  // Handle checkout - validates and then proceeds to payment
  const handleCheckout = async () => {
    // Validate all required fields
    if (!isAuthenticated || !formData.email || !formData.fullName || !formData.phone || !termsAccepted) {
      toast({
        variant: "destructive",
        title: "Please fill all required fields",
        description: "Make sure you're logged in, entered your phone number, and accepted the terms.",
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    // Validate phone format
    if (!isValidPhone(formData.phone)) {
      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number (at least 6 digits).",
      });
      return;
    }

    // CRITICAL: Check if WhiteLabel addon is selected but not configured
    if (hasWhiteLabelAddon && !whiteLabelConfig) {
      setShowWhiteLabelModal(true);
      toast({
        title: "White Label Configuration Required",
        description: "Please enter your brand name and domain before proceeding to payment.",
      });
      return;
    }

    // Proceed to payment directly
    await proceedToPayment();
  };

  // State for payment confirmation dialog
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [pendingWlConfig, setPendingWlConfig] = useState<{ brandName: string; domain: string } | null>(null);

  // Clear stale payment sessions on component mount
  useEffect(() => {
    const existingSession = sessionStorage.getItem('payment_in_progress');
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        // Clear sessions older than 2 minutes (user likely cancelled/abandoned)
        if (Date.now() - sessionData.timestamp > 2 * 60 * 1000) {
          sessionStorage.removeItem('payment_in_progress');
        }
      } catch (error) {
        logger.warn('Failed to parse payment session data:', error);
        sessionStorage.removeItem('payment_in_progress');
      }
    }
  }, []);

  // Separate function to proceed to payment (can be called directly or after WhiteLabel config)
  // Includes smart session handling with user confirmation for incomplete sessions
  const proceedToPayment = useCallback(async (wlConfig?: { brandName: string; domain: string } | null) => {
    // Check for existing session - if found, ask user for confirmation
    const existingSession = sessionStorage.getItem('payment_in_progress');
    if (existingSession && !showPaymentConfirmation) {
      try {
        const sessionData = JSON.parse(existingSession);
        // If payment was initiated less than 2 minutes ago, show confirmation dialog
        if (Date.now() - sessionData.timestamp < 2 * 60 * 1000) {
          setPendingWlConfig(wlConfig || null);
          setShowPaymentConfirmation(true);
          return;
        }
      } catch {
        // Invalid session data, clear it
        sessionStorage.removeItem('payment_in_progress');
      }
    }

    // Clear confirmation state
    setShowPaymentConfirmation(false);
    setIsProcessing(true);

    // Generate unique payment session ID to prevent duplicates
    const newSessionId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setPaymentSessionId(newSessionId);
    sessionStorage.setItem('payment_in_progress', JSON.stringify({
      sessionId: newSessionId,
      timestamp: Date.now(),
      email: formData.email
    }));

    try {
      // Validate required fields before proceeding
      if (!formData.email || !isValidEmail(formData.email)) {
        toast({
          variant: "destructive",
          title: "Invalid Email",
          description: "Please enter a valid email address."
        });
        setIsProcessing(false);
        return;
      }

      if (!formData.fullName || formData.fullName.trim().length < 2) {
        toast({
          variant: "destructive",
          title: "Invalid Name",
          description: "Please enter your full name (at least 2 characters)."
        });
        setIsProcessing(false);
        return;
      }

      if (!formData.phone || !isValidPhone(formData.phone)) {
        toast({
          variant: "destructive",
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number (at least 6 digits)."
        });
        setIsProcessing(false);
        return;
      }

      // Combine country code with phone number
      const fullPhoneNumber = `${countryCode}${formData.phone.replace(/^0+/, '')}`;

      // Additional tracking data
      const trackingData = {
        clientTransactionId,
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sessionId: newSessionId,
        source: 'web',
      };

      if (purchaseType === "credits" && selectedCreditPack) {
        // Credit pack purchase
        const result = await AivedhaAPI.purchaseCredits({
          packId: selectedCreditPack.id,
          currency,
          couponCode: couponCode || undefined,
          email: formData.email,
          fullName: formData.fullName,
          phone: fullPhoneNumber,
          ...trackingData,
        });

        // Type-safe response handling
        const checkoutResult = result as CheckoutResponse;

        // Handle 100% discount - credits granted immediately
        if (checkoutResult.free_order && checkoutResult.credits_added) {
          sessionStorage.removeItem(CART_STORAGE_KEY);
          sessionStorage.removeItem('payment_in_progress');
          // Redirect to success page with free order info
          window.location.href = `/payment-success?type=credits&pack=${selectedCreditPack.id}&credits=${checkoutResult.credits}&free=true`;
        } else {
          // Handle PayPal response - check multiple URL fields for compatibility
          const checkoutUrl = checkoutResult.hostedPageUrl || checkoutResult.checkout_url;
          if (checkoutUrl) {
            // Clear cart on successful redirect
            sessionStorage.removeItem(CART_STORAGE_KEY);
            window.location.href = checkoutUrl;
          } else {
            throw new Error(checkoutResult.error || checkoutResult.message || "Failed to create checkout session");
          }
        }
      } else if (selectedPlan) {
        // Subscription purchase - format: planId_billingCycle (e.g., raksha_monthly, vajra_yearly)
        const planCode = billingCycle === 'yearly' ? `${selectedPlan.id}_yearly` : selectedPlan.id;
        const configToUse = wlConfig || whiteLabelConfig;

        // Map addon names to codes that Lambda expects
        const addonNameToCode: Record<string, string> = {
          'Scheduled Audits': 'scheduler',
          'White-Label Reports': 'whitelabel',
          'API Access': 'api-access',
        };
        const addonCodes = selectedAddons.map(name => addonNameToCode[name] || name);

        const result = await AivedhaAPI.createCheckoutSession({
          planCode,
          currency,
          billingCycle,
          couponCode: couponCode || undefined,
          email: formData.email,
          fullName: formData.fullName,
          phone: fullPhoneNumber,
          addons: addonCodes,
          whiteLabelConfig: configToUse || undefined,
          ...trackingData,
        });

        // Type-safe response handling
        const checkoutResult = result as CheckoutResponse;

        // Handle PayPal response - check multiple URL fields for compatibility
        const checkoutUrl = checkoutResult.hostedPageUrl || checkoutResult.checkout_url;
        if (checkoutResult.success !== false && checkoutUrl) {
          // Clear cart on successful redirect
          sessionStorage.removeItem(CART_STORAGE_KEY);
          window.location.href = checkoutUrl;
        } else {
          throw new Error(checkoutResult.error || checkoutResult.message || "Failed to create checkout session");
        }
      }
    } catch (error: unknown) {
      logger.error("Checkout error:", error);
      // Parse error message for better user feedback
      let errorTitle = "Checkout Failed";
      let errorDescription = `Please try again or contact ${APP_CONFIG.SUPPORT_EMAIL}`;

      // Type-safe error handling
      const apiError = error as ApiError;
      const errorMsg = (apiError?.message?.toLowerCase() || "");

      if (errorMsg.includes("network") || errorMsg.includes("timeout") || errorMsg.includes("fetch")) {
        errorTitle = "Connection Error";
        errorDescription = "Unable to connect to payment server. Please check your internet connection and try again.";
      } else if (errorMsg.includes("invalid") || errorMsg.includes("required")) {
        errorTitle = "Invalid Details";
        errorDescription = "Please verify your contact details and try again.";
      } else if (apiError?.message) {
        errorDescription = apiError.message;
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorDescription,
      });
      // Clear payment session on error so user can retry
      sessionStorage.removeItem('payment_in_progress');
    } finally {
      setIsProcessing(false);
    }
  }, [countryCode, formData, purchaseType, selectedCreditPack, currency, selectedPlan, billingCycle, couponCode, selectedAddons, whiteLabelConfig, toast, showPaymentConfirmation, clientTransactionId]);

  // Handle WhiteLabel modal submit - auto-proceed to checkout after config
  const handleWhiteLabelSubmit = useCallback(async (data: { brandName: string; domain: string }[]) => {
    if (data.length > 0) {
      const config = data[0]; // Use first entry for now
      setWhiteLabelConfig(config);

      // Save to API
      try {
        await AivedhaAPI.saveWhiteLabelConfig({
          userId: currentUser?.email || currentUser?.identityId,
          brandName: config.brandName,
          domain: config.domain,
        });
      } catch (error) {
        logger.error("Failed to save WhiteLabel config:", error);
      }

      // Close modal and auto-proceed to checkout
      setShowWhiteLabelModal(false);

      // Auto-proceed to payment after config is set
      setTimeout(() => {
        proceedToPayment(config);
      }, 100);
    } else {
      setShowWhiteLabelModal(false);
    }
  }, [currentUser, proceedToPayment]);

  // Handle WhiteLabel modal cancel - remove addon from selection
  const handleWhiteLabelCancel = useCallback(() => {
    setShowWhiteLabelModal(false);
    setSelectedAddons(prev => prev.filter(a => a !== "White-Label Reports"));
    setWhiteLabelConfig(null);
    toast({
      title: "Addon Removed",
      description: "White-Label Reports has been removed from your order.",
    });
  }, [toast]);

  // Clear cart - reset all selections
  const handleClearCart = useCallback(() => {
    setSelectedPlan(null);
    setSelectedCreditPack(null);
    setSelectedAddons([]);
    setWhiteLabelConfig(null);
    clearCoupon();
    sessionStorage.removeItem(CART_STORAGE_KEY);
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart.",
    });
  }, [clearCoupon, toast]);

  // Show loading while currency profile is being determined (for overseas users)
  if (!profileCurrencyLoaded && isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your preferences...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="max-w-md mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-card/80 backdrop-blur-md border-2 border-yellow-500/30 shadow-lg">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LogIn className="h-8 w-8 text-yellow-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground font-orbitron">
                    Login Required
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Please sign in to your account to purchase a subscription plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                      You need to be logged in to subscribe. Your subscription will be linked to your
                      account.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Link to="/login" className="block">
                      <Button variant="invertPrimary" size="compact" className="h-12 rounded-xl">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In to Continue
                      </Button>
                    </Link>

                    <p className="text-center text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline">
                        Create one for free
                      </Link>
                    </p>
                  </div>

                  <Separator />

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">Or try our free audit first:</p>
                    <Link to="/security-audit">
                      <Button variant="invertOutline" size="compact" className="rounded-xl">
                        <Shield className="h-4 w-4 mr-2" />
                        Start Free Audit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  // No plan/pack selected - show plan selection
  if (!selectedPlan && !selectedCreditPack) {
    return (
      <Layout>
        <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-4 font-orbitron">
                  Select a Plan
                </h1>
                <p className="text-muted-foreground mb-6">Choose a subscription plan to continue</p>

                {/* Billing Toggle */}
                <div className="flex justify-center">
                  <BillingToggle
                    billingCycle={billingCycle}
                    onChange={setBillingCycle}
                    savingsText="Save 10%"
                  />
                </div>
              </div>

              {/* 4 Plan Cards Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PLANS.filter((p) => p.id !== "aarambh").map((plan, index) => {
                  const AnimatedIcon = getAnimatedPlanIcon(plan.id);
                  const colorMap: Record<string, { gradient: string; button: string; border: string; text: string }> = {
                    "#3B82F6": { gradient: "from-blue-500/20 via-blue-500/5 to-transparent", button: "bg-blue-500 hover:bg-blue-600", border: "hover:border-blue-500/50", text: "#3b82f6" },
                    "#8B5CF6": { gradient: "from-violet-500/20 via-violet-500/5 to-transparent", button: "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600", border: "hover:border-violet-500/50", text: "#8b5cf6" },
                    "#F59E0B": { gradient: "from-amber-500/20 via-amber-500/5 to-transparent", button: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600", border: "hover:border-amber-500/50", text: "#f59e0b" },
                    "#EF4444": { gradient: "from-rose-500/20 via-rose-500/5 to-transparent", button: "bg-rose-500 hover:bg-rose-600", border: "hover:border-rose-500/50", text: "#ef4444" },
                  };
                  const colors = colorMap[plan.color] || colorMap["#3B82F6"];
                  const price = billingCycle === "yearly"
                    ? plan.price.yearly
                    : plan.price.monthly;
                  const originalPrice = billingCycle === "yearly"
                    ? plan.price.monthly * 12
                    : null;
                  // Credits: monthly credits or yearly (monthly * 12)
                  const displayCredits = billingCycle === "yearly" ? plan.credits * 12 : plan.credits;

                  // Check if this is the user's current active plan
                  const isUserActivePlan = userCurrentPlan &&
                    subscriptionStatus === 'active' &&
                    userCurrentPlan.toLowerCase().includes(plan.id.toLowerCase());

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      whileHover={isUserActivePlan ? {} : { y: -8, transition: { duration: 0.3 } }}
                      className="relative h-full"
                    >
                      <Card
                        className={`border-2 transition-all duration-500 h-full overflow-hidden relative bg-card/80 backdrop-blur-sm dark:bg-card/90 ${
                          isUserActivePlan
                            ? "cursor-not-allowed opacity-75 border-emerald-500/50 ring-2 ring-emerald-500/30"
                            : `cursor-pointer ${colors.border}`
                        } ${
                          plan.recommended && !isUserActivePlan
                            ? "border-violet-500/50 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/30"
                            : !isUserActivePlan ? "border-border/50 dark:border-border/30" : ""
                        }`}
                        onClick={() => !isUserActivePlan && setSelectedPlan(plan)}
                      >
                        {/* Active Plan Badge */}
                        {isUserActivePlan && (
                          <div className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-xs font-semibold py-1.5 text-center z-10">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Your Current Plan
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-b ${colors.gradient} pointer-events-none`} />

                        <CardContent className={`relative p-5 flex flex-col h-full ${isUserActivePlan ? 'pt-10' : 'pt-5'}`}>
                          {/* Header with Animated Plan Icon */}
                          <div className="text-center mb-4">
                            <div className="mx-auto mb-3 transition-transform duration-300 hover:scale-110">
                              <AnimatedIcon size={70} className="mx-auto" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                            <p className="text-xs text-muted-foreground italic">
                              {plan.nameHindi} — "{plan.meaning}"
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-center mb-4">
                            {originalPrice && billingCycle === "yearly" && (
                              <div className="text-xs text-muted-foreground line-through mb-1">
                                {formatPrice(originalPrice)}
                              </div>
                            )}
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-3xl font-bold text-foreground">
                                {formatPrice(price)}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                /{billingCycle === "yearly" ? "year" : "month"}
                              </span>
                            </div>
                            {billingCycle === "yearly" && (
                              <Badge variant="secondary" className="mt-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 border-0 text-xs">
                                Save 10% yearly
                              </Badge>
                            )}
                          </div>

                          {/* Credits - Updated for yearly toggle */}
                          <div className="bg-muted/50 dark:bg-muted/30 rounded-xl p-3 mb-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                              <span className="text-2xl font-bold text-foreground">{displayCredits}</span>
                              <span className="text-muted-foreground text-sm">Credits</span>
                            </div>
                          </div>

                          <button
                            disabled={isUserActivePlan}
                            className={`w-full py-5 text-sm font-semibold rounded-xl shadow-lg mt-auto transition-all duration-300 ${
                              isUserActivePlan
                                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                : `${colors.button} text-white`
                            }`}
                          >
                            {isUserActivePlan ? "Active Plan" : `Select ${plan.name}`}
                          </button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Features Section */}
              <motion.div
                className="mt-16"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-center text-foreground mb-8 font-orbitron">
                  All Plans Include
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      title: "Security Vulnerability Scan",
                      description: "Deep analysis of OWASP Top 10 vulnerabilities, XSS, SQL Injection, and more",
                      icon: "shield",
                      color: "#3B82F6"
                    },
                    {
                      title: "SSL/TLS Certificate Check",
                      description: "Complete SSL analysis with expiry alerts and configuration validation",
                      icon: "lock",
                      color: "#8B5CF6"
                    },
                    {
                      title: "PDF Security Reports",
                      description: "Professional branded reports ready to share with stakeholders",
                      icon: "file",
                      color: "#F59E0B"
                    },
                    {
                      title: "AI-Powered Analysis",
                      description: "Google Gemini 3.0 powered intelligent threat detection",
                      icon: "ai",
                      color: "#EF4444"
                    }
                  ].map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="relative"
                    >
                      <Card className="bg-card/60 backdrop-blur-sm border-border/30 h-full overflow-hidden">
                        <CardContent className="p-5 text-center">
                          {/* Animated Icon */}
                          <div className="mb-4 flex justify-center">
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden dynamic-bg"
                              style={{ '--dynamic-bg': `${feature.color}15` } as React.CSSProperties}
                            >
                              {/* Animated glow effect */}
                              <motion.div
                                className="absolute inset-0 rounded-2xl dynamic-bg"
                                style={{ '--dynamic-bg': `${feature.color}20` } as React.CSSProperties}
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 0.2, 0.5],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                              {feature.icon === "shield" && (
                                <motion.div
                                  animate={{ rotate: [0, 5, -5, 0] }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                >
                                  <Shield className="w-8 h-8 dynamic-color" style={{ '--dynamic-color': feature.color } as React.CSSProperties} />
                                </motion.div>
                              )}
                              {feature.icon === "lock" && (
                                <motion.div
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <Lock className="w-8 h-8 dynamic-color" style={{ '--dynamic-color': feature.color } as React.CSSProperties} />
                                </motion.div>
                              )}
                              {feature.icon === "file" && (
                                <motion.div
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2.5, repeat: Infinity }}
                                >
                                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={feature.color} strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                  </svg>
                                </motion.div>
                              )}
                              {feature.icon === "ai" && (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                >
                                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={feature.color} strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                  </svg>
                                </motion.div>
                              )}
                            </div>
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <div className="text-center mt-8">
                <Link to="/pricing">
                  <Button variant="invertOutline" size="compact" className="rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    View All Plans
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  const AnimatedIcon = selectedPlan ? getAnimatedPlanIcon(selectedPlan.id) : null;
  const finalPrice = getFinalPrice();
  const originalPrice = getOriginalPriceValue();
  const hasDiscount = couponDiscount > 0 && originalPrice !== finalPrice;

  return (
    <Layout>
      <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
              <CheckCircle className="h-3 w-3 mr-1" />
              Logged in as {formData.email}
            </Badge>
            <h1 className="text-3xl font-bold text-foreground mb-2 font-orbitron">
              Complete Your {purchaseType === "credits" ? "Credit Purchase" : "Subscription"}
            </h1>
            <p className="text-muted-foreground">
              Secure checkout • Credit/Debit Card or PayPal
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Order Summary - 2 columns */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg relative">
                {/* Clear Cart Button - Top Right */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={handleClearCart}
                    className="p-1.5 rounded-lg bg-muted/50 hover:bg-destructive/10 hover:text-destructive transition-colors group"
                    title="Clear Cart"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                  </button>
                </div>
                <CardHeader className="text-center">
                  {purchaseType === "credits" ? (
                    <>
                      <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
                          <Coins className="h-8 w-8 text-yellow-500" />
                        </div>
                      </div>
                      <CardTitle>Credit Pack</CardTitle>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center mb-2">
                        {AnimatedIcon && <AnimatedIcon size={80} />}
                      </div>
                      <CardTitle>{selectedPlan?.name} Plan</CardTitle>
                      {selectedPlan && (
                        <CardDescription>
                          {selectedPlan.nameHindi} • {selectedPlan.meaning}
                        </CardDescription>
                      )}
                    </>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Plan/Pack Details */}
                  <div
                    className="p-4 rounded-xl dynamic-bg"
                    style={{ '--dynamic-bg': selectedPlan ? `${selectedPlan.color}10` : "rgba(234, 179, 8, 0.1)" } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">
                        {purchaseType === "credits" ? "Credits" : "Plan"}
                      </span>
                      <span className="font-medium text-foreground">
                        {purchaseType === "credits"
                          ? `${selectedCreditPack?.credits} Credits`
                          : `${selectedPlan?.credits} credits/month`}
                      </span>
                    </div>
                    {purchaseType === "subscription" && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-muted-foreground">Billing</span>
                          <span className="font-medium text-foreground capitalize">
                            {billingCycle}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Currency</span>
                          <span className="font-medium text-foreground">{currency}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Selected Addons - Cart Style */}
                  {selectedAddons.length > 0 && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        Addons
                      </p>
                      <div className="space-y-2">
                        {selectedAddons.map((addon, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              <span className="text-sm text-foreground">{addon}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const addonData = RECURRING_ADDONS.find(a => a.name === addon);
                                return addonData ? (
                                  <span className="text-xs text-muted-foreground">+{formatPrice(addonData.price)}/mo</span>
                                ) : null;
                              })()}
                              <button
                                className="text-xs text-destructive hover:underline"
                                onClick={() => {
                                  setSelectedAddons(prev => prev.filter(a => a !== addon));
                                  if (addon === "White-Label Reports") {
                                    setWhiteLabelConfig(null);
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    {hasDiscount && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Original Price</span>
                        <span className="text-muted-foreground line-through">
                          {formatPrice(originalPrice)}
                        </span>
                      </div>
                    )}
                    {hasDiscount && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Discount ({couponCode})</span>
                        <span className="text-green-600">
                          -{couponType === "percentage"
                            ? `${couponDiscount}%`
                            : formatPrice(couponDiscount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-foreground">Total</span>
                      <span
                        className="text-2xl font-bold dynamic-color"
                        style={{ '--dynamic-color': selectedPlan?.color || "#eab308" } as React.CSSProperties}
                      >
                        {formatPrice(finalPrice)}
                      </span>
                    </div>
                    {purchaseType === "subscription" && (
                      <p className="text-xs text-muted-foreground text-right">
                        Billed {billingCycle}. Cancel anytime.
                      </p>
                    )}
                  </div>

                  {/* Change Plan Link */}
                  <Link to="/pricing">
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Change Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Checkout Form - 3 columns */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Checkout Details
                  </CardTitle>
                  <CardDescription>
                    Pay with credit/debit card or PayPal account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Information - Organized Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-sm font-medium">Full Name *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="bg-background/50 rounded-lg h-10"
                      />
                    </div>
                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="bg-background/50 rounded-lg h-10"
                        disabled={!!currentUser?.email}
                      />
                    </div>
                    {/* Phone with Country Code */}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className={`text-sm font-medium ${!formData.phone ? 'text-yellow-600' : ''}`}>
                        Phone * {!formData.phone && <span className="text-xs font-normal">(Required)</span>}
                      </Label>
                      <div className="flex gap-2">
                        <select
                          id="countryCode"
                          aria-label="Country code"
                          title="Country code"
                          value={countryCode}
                          onChange={(e) => handleCountryCodeChange(e.target.value)}
                          className="w-[90px] h-10 px-2 bg-background/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+61">🇦🇺 +61</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+81">🇯🇵 +81</option>
                          <option value="+86">🇨🇳 +86</option>
                          <option value="+55">🇧🇷 +55</option>
                          <option value="+52">🇲🇽 +52</option>
                          <option value="+7">🇷🇺 +7</option>
                          <option value="+27">🇿🇦 +27</option>
                          <option value="+234">🇳🇬 +234</option>
                        </select>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Phone number"
                          required
                          className="flex-1 bg-background/50 rounded-lg h-10"
                        />
                      </div>
                    </div>
                    {/* Coupon Code - Only for credit pack purchases */}
                    {/* Note: Subscription discounts are handled via PayPal promo codes */}
                    {purchaseType === "credits" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Coupon Code</Label>
                        <CouponInput
                          couponCode={couponCode}
                          onApply={(code) => validateCoupon(code, 'credits')}
                          onClear={clearCoupon}
                          error={couponError}
                          discount={couponDiscount}
                          loading={validatingCoupon}
                          discountType={couponType}
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Terms */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      aria-describedby="terms-description"
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" id="terms-description" className="text-sm text-muted-foreground font-normal cursor-pointer">
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary underline font-medium italic hover:text-primary/80 transition-colors">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-primary underline font-medium italic hover:text-primary/80 transition-colors">
                        Privacy Policy
                      </Link>
                      .{" "}
                      {purchaseType === "subscription"
                        ? `I'll be charged ${formatPrice(finalPrice)} ${currency} ${billingCycle}.`
                        : `I'll be charged ${formatPrice(finalPrice)} ${currency} one-time.`}
                    </Label>
                  </div>

                  {/* Payment buttons */}
                  <div className="space-y-4">
                    {!termsAccepted ? (
                      <Alert className="bg-yellow-500/10 border-yellow-500/20">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <AlertDescription>
                          Please accept the terms and conditions to proceed.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex justify-center">
                        <button
                          onClick={handleCheckout}
                          disabled={isProcessing || !formData.email || !formData.fullName || !formData.phone}
                          className="btn-thunder h-12 px-8 inline-flex items-center justify-center text-base"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5 mr-2" />
                              <span>Proceed to Payment - {formatPrice(finalPrice)}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Payment Methods */}
                  <div className="text-center pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Accepted Payment Methods</p>
                    <div className="flex items-center justify-center gap-3 text-xs">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded font-medium">VISA</span>
                      <span className="px-2 py-1 bg-red-500/10 text-red-600 rounded font-medium">Mastercard</span>
                      <span className="px-2 py-1 bg-blue-600/10 text-blue-700 rounded font-medium">Amex</span>
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-700 rounded font-medium">PayPal</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span>SSL Secured</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        <span>PCI Compliant</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help Section */}
              <Card className="mt-6 bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Need help? Contact{" "}
                    <a href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`} className="text-primary hover:underline">
                      {APP_CONFIG.SUPPORT_EMAIL}
                    </a>{" "}
                    or visit our{" "}
                    <Link to="/faq" className="text-primary hover:underline">
                      FAQ
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* WhiteLabel Modal - CRITICAL: Must appear before payment for WhiteLabel addon */}
      <WhiteLabelModal
        isOpen={showWhiteLabelModal}
        onClose={handleWhiteLabelCancel}
        onSubmit={handleWhiteLabelSubmit}
        currency="USD"
        price={60}
        mode="single"
      />

      {/* Payment Confirmation Dialog - For incomplete/cancelled sessions */}
      <Dialog open={showPaymentConfirmation} onOpenChange={setShowPaymentConfirmation}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Continue Payment?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              A previous payment session was started but not completed. Would you like to start a new payment?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentConfirmation(false);
                setPendingWlConfig(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                sessionStorage.removeItem('payment_in_progress');
                setShowPaymentConfirmation(false);
                proceedToPayment(pendingWlConfig);
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Continue to Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
