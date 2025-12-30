/**
 * AiVedha Guard - First-Time User Onboarding Popup
 * Creates customer and awards free credits
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import { PLAN_CREDITS } from "@/constants/plans";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/utils/type-guards";
import {
  Gift,
  Loader2,
  X,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  CreditCard,
} from "lucide-react";

interface OnboardingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
  userEmail: string;
  userName?: string;
  userPicture?: string;
}

interface OnboardingData {
  fullName: string;
  category: string;
  entityName: string;
  dateOfBirthOrIncorporation: string;
  employeeCount?: number;
  gender?: string;
  address: {
    country: string;
    pinCode: string;
    state: string;
    city: string;
    addressLine1: string;
    addressLine2?: string;
  };
  taxId?: string;
  sameAsBilling: boolean;
  billingAddress?: {
    name: string;
    country: string;
    pinCode: string;
    state: string;
    city: string;
    addressLine1: string;
    addressLine2?: string;
  };
}

export const OnboardingPopup: React.FC<OnboardingPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  userEmail,
  userName = "",
  userPicture,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hostedPageUrl, setHostedPageUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(PLAN_CREDITS.aarambh);
  const [error, setError] = useState<string | null>(null);
  const [customerCreationAttempted, setCustomerCreationAttempted] = useState(false);

  // Create customer when popup opens - but only once per session
  useEffect(() => {
    if (isOpen && !hostedPageUrl && !isSuccess && !customerCreationAttempted) {
      // Check localStorage to prevent duplicate creation across refreshes
      const onboardingKey = `onboarding_started_${userEmail}`;
      const previouslyStarted = sessionStorage.getItem(onboardingKey);

      if (!previouslyStarted) {
        sessionStorage.setItem(onboardingKey, 'true');
        setCustomerCreationAttempted(true);
        createCustomer();
      } else {
        // Already started, don't create again - just show success
        setIsLoading(false);
        setIsSuccess(true);
      }
    }
    // Dependencies intentionally limited to isOpen to prevent re-triggering on state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const createCustomer = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create customer in DynamoDB and award free credits
      const response = await AivedhaAPI.getCustomerOnboardingPage({
        email: userEmail,
        fullName: userName || userEmail.split('@')[0],
      });

      if (response.hostedPageUrl) {
        // Customer portal URL available - show iframe
        setHostedPageUrl(response.hostedPageUrl);
      } else if (response.success || response.useInternalForm || response.customerId) {
        // Customer created successfully - show success screen
        setIsSuccess(true);
        // Display existing credits (credits were awarded during signup, not here)
        setCreditsAwarded(response.user?.credits || 0);

        toast({
          title: "Welcome to AiVedha Guard!",
          description: "Your profile has been set up successfully.",
        });
      } else {
        throw new Error("Failed to create customer profile");
      }
    } catch (err: unknown) {
      logger.error("Failed to create customer:", err);
      setError(getErrorMessage(err) || "Failed to create profile");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for messages from iframe (completion callback)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from PayPal or our domain
      if (event.origin.includes('paypal') || event.origin.includes('aivedha')) {
        // Handle completion
        if (event.data?.status === 'success' || event.data?.type === 'hosted_page_completed') {
          handleOnboardingComplete();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // handleOnboardingComplete is stable within component lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnboardingComplete = () => {
    toast({
      title: "Welcome to AiVedha Guard!",
      description: `Your profile has been created and ${creditsAwarded} free credits have been added.`,
    });

    // Create minimal onboarding data for compatibility
    onComplete({
      fullName: userName || "",
      category: "individual",
      entityName: "",
      dateOfBirthOrIncorporation: "",
      address: {
        country: "",
        pinCode: "",
        state: "",
        city: "",
        addressLine1: "",
      },
      sameAsBilling: true,
    });
  };

  const handleContinue = () => {
    handleOnboardingComplete();
    onClose();
  };

  const handleSkip = () => {
    toast({
      title: "Onboarding Skipped",
      description: "You can complete your profile later to receive free credits.",
    });
    onClose();
  };

  const handleOpenInNewTab = () => {
    if (hostedPageUrl) {
      window.open(hostedPageUrl, '_blank');
    }
  };

  // Success Screen Component
  const SuccessScreen = () => (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6 px-6 text-center">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/20 rounded-full animate-pulse" />
        <div className="relative bg-primary/10 p-6 rounded-full">
          <Sparkles className="h-16 w-16 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome to AiVedha Guard!
        </h2>
        <p className="text-muted-foreground max-w-md">
          Your profile has been created successfully. You're all set to start securing your websites!
        </p>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div className="text-left">
            <p className="text-sm text-muted-foreground">Free Credits Added</p>
            <p className="text-3xl font-bold text-primary">{creditsAwarded}</p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleContinue}
        size="lg"
        className="gap-2 bg-primary text-primary-foreground border-2 border-transparent hover:bg-transparent hover:text-primary hover:border-primary transition-all duration-300 hover:-translate-y-1"
      >
        <CheckCircle2 className="h-5 w-5" />
        Continue to Dashboard
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden">
        {/* Header - static, no animations, curved bottom edges */}
        <div className="sticky top-0 bg-background z-10 px-6 py-4 border-b border-border/30 rounded-b-xl flex items-center justify-between">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-primary" />
              {isSuccess ? "Profile Created!" : "Complete Your Profile for Free Credits"}
            </DialogTitle>
            {!isSuccess && (
              <p className="text-sm text-muted-foreground">
                Fill in your details to receive <span className="text-primary font-semibold">3 free credits</span>
              </p>
            )}
          </DialogHeader>
          <div className="flex items-center gap-2">
            {hostedPageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in new tab
              </Button>
            )}
            {!isSuccess && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 h-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Creating your profile...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6">
              <div className="text-destructive text-center">
                <p className="font-medium">Failed to create profile</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button
                onClick={createCustomer}
                variant="outline"
                className="border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:-translate-y-1"
              >
                Try Again
              </Button>
            </div>
          ) : isSuccess ? (
            <SuccessScreen />
          ) : hostedPageUrl ? (
            <iframe
              src={hostedPageUrl}
              className="w-full h-[calc(85vh-80px)] border-0"
              title="Profile Onboarding"
              allow="payment"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          ) : null}
        </div>

        {/* Footer with skip option */}
        {!isSuccess && (
          <div className="sticky bottom-0 bg-background border-t px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>No credit card required for free credits</span>
            </div>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 hover:-translate-y-1"
            >
              Skip for Later
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingPopup;

/* =============================================================================
 * COMMENTED OUT: Original Custom Form Implementation
 * Keeping for reference - can be restored if iframe approach doesn't work
 * =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import {
  User,
  Building2,
  GraduationCap,
  Landmark,
  Gift,
  Info,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  FileText,
  X,
} from "lucide-react";

// Complete 195 countries with validation patterns
const COUNTRIES = [
  { code: "AF", name: "Afghanistan", pinPattern: /^\d{4}$/, pinLabel: "Postal Code", taxPattern: /^.+$/, taxLabel: "Tax ID" },
  { code: "AL", name: "Albania", pinPattern: /^\d{4}$/, pinLabel: "Postal Code", taxPattern: /^.+$/, taxLabel: "NIPT" },
  // ... rest of the 195 countries ...
  { code: "ZW", name: "Zimbabwe", pinPattern: /^.+$/, pinLabel: "Postal Code", taxPattern: /^.+$/, taxLabel: "TIN" },
].sort((a, b) => a.name.localeCompare(b.name));

// Category options
const CATEGORIES = [
  { value: "organisation", label: "Organisation", icon: Building2 },
  { value: "individual", label: "Individual User", icon: User },
  { value: "education", label: "Education Institute", icon: GraduationCap },
  { value: "government", label: "Government", icon: Landmark },
];

// Gender options for individual
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// Info tooltip component
const InfoTooltip = ({ text }: { text: string }) => (
  <span className="relative group inline-flex items-center">
    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs bg-foreground text-background rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 max-w-[200px] text-center">
      {text}
    </span>
  </span>
);

// ... Original form implementation with all 195 countries, category selection,
// address fields, billing address, tax ID validation, etc.
// This was a comprehensive multi-field form that collected:
// - Full Name, Category (Org/Individual/Education/Government)
// - Entity Name or Gender based on category
// - Date of Birth/Incorporation
// - Employee/Student count for orgs
// - Address: Country, PIN Code, State, City, Address Lines
// - Tax ID with country-specific validation
// - Billing address option (same or different)
// - Auto-validation of PIN codes and Tax IDs based on country patterns

*/
