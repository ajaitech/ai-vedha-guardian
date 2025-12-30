import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, Shield, ExternalLink, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const COOKIE_CONSENT_KEY = "aivedha_cookie_consent";
const COOKIE_CONSENT_VERSION = "2.0";

interface CookieConsentState {
  accepted: boolean;
  version: string;
  timestamp: string;
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  personalization_storage: 'granted' | 'denied';
}

// Declare gtag function type
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Consent preferences
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consentData = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consentData) {
      try {
        const consent: CookieConsentState = JSON.parse(consentData);
        if (consent.version === COOKIE_CONSENT_VERSION && consent.timestamp) {
          return; // Don't show banner - user already made a choice
        }
      } catch {
        // Invalid consent data, show banner
      }
    }

    // Show banner after a short delay for smooth entrance
    const timer = setTimeout(() => {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 50);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const updateGoogleConsent = (consentData: CookieConsentState) => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': consentData.ad_storage,
        'ad_user_data': consentData.ad_user_data,
        'ad_personalization': consentData.ad_personalization,
        'analytics_storage': consentData.analytics_storage,
        'personalization_storage': consentData.personalization_storage
      });
    }
  };

  const handleAcceptAll = () => {
    const consentData: CookieConsentState = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      personalization_storage: 'granted'
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    updateGoogleConsent(consentData);
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleAcceptSelected = () => {
    const consentData: CookieConsentState = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      analytics_storage: analyticsEnabled ? 'granted' : 'denied',
      ad_storage: adsEnabled ? 'granted' : 'denied',
      ad_user_data: adsEnabled ? 'granted' : 'denied',
      ad_personalization: adsEnabled ? 'granted' : 'denied',
      personalization_storage: personalizationEnabled ? 'granted' : 'denied'
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    updateGoogleConsent(consentData);
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleRejectAll = () => {
    const consentData: CookieConsentState = {
      accepted: true, // User made a choice
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      personalization_storage: 'denied'
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    updateGoogleConsent(consentData);
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-lg z-50 transition-all duration-300 ease-out ${
        isAnimating
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      }`}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Cookie Preferences</h3>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use cookies to enhance your experience, analyze site traffic, and show personalized ads.
            You can customize your preferences below.
          </p>

          {/* Detailed Settings */}
          {showDetails && (
            <div className="space-y-3 py-2 border-t border-b border-border/50">
              {/* Essential - Always On */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Essential</p>
                  <p className="text-xs text-muted-foreground">Required for site functionality</p>
                </div>
                <Switch checked disabled className="opacity-50" />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Analytics</p>
                  <p className="text-xs text-muted-foreground">Help us improve our services</p>
                </div>
                <Switch
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                />
              </div>

              {/* Advertising */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Advertising</p>
                  <p className="text-xs text-muted-foreground">Personalized ads & measurement</p>
                </div>
                <Switch
                  checked={adsEnabled}
                  onCheckedChange={setAdsEnabled}
                />
              </div>

              {/* Personalization */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Personalization</p>
                  <p className="text-xs text-muted-foreground">Customized content & experience</p>
                </div>
                <Switch
                  checked={personalizationEnabled}
                  onCheckedChange={setPersonalizationEnabled}
                />
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex items-center space-x-4 text-xs">
            <Link
              to="/privacy"
              className="text-primary hover:underline flex items-center space-x-1"
            >
              <Shield className="h-3 w-3" />
              <span>Privacy Policy</span>
            </Link>
            <Link
              to="/terms"
              className="text-primary hover:underline flex items-center space-x-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Terms of Service</span>
            </Link>
          </div>

          {/* buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRejectAll}
              className="flex-1 rounded-xl text-sm"
            >
              Reject All
            </Button>
            {showDetails ? (
              <Button
                size="sm"
                onClick={handleAcceptSelected}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm"
              >
                Save Preferences
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm"
              >
                Accept All
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
