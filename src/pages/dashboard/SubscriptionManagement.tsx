import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import { Link } from "react-router-dom";
import { getErrorMessage } from "@/utils/type-guards";
import {
  VALIDITY_OPTIONS,
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_REASON_MAX_LENGTH,
  API_KEY_CREATE_COOLDOWN_MS,
  SENSITIVE_DATA_DISPLAY_MS,
  COPY_TOAST_DURATION_MS,
} from "@/constants/subscription";
import { APP_CONFIG } from "@/config";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SubscriptionAPI from "@/lib/subscription-api";
import AivedhaAPI from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Loader2,
  ArrowLeft,
  Shield,
  CreditCard,
  FileText,
  Settings,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Crown,
  Lock,
  LogIn,
  Download,
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Terminal,
  Code,
} from "lucide-react";
import { FaGithub } from "react-icons/fa6";

interface UserSubscription {
  plan: string;
  status: string;
  credits: number;
  nextBillingDate?: string;
  email?: string;
  subscriptionId?: string;
  autoRenew?: boolean;
}

interface Invoice {
  invoiceId: string;
  invoiceNumber?: string;
  date: string;
  amount: string | number;
  currency: string;
  status: string;
  pdfUrl?: string;
}

interface ApiKey {
  api_key_id: string;
  name: string;
  key_prefix: string;
  reason: string;
  status: 'active' | 'revoked' | 'expired' | 'disabled';
  validity_days: number;
  created_at: string;
  expires_at: string;
  last_used_at?: string;
  usage_count: number;
  permissions: string[];
}

/**
 * SubscriptionManagement - PayPal Subscription Portal
 *
 * This page provides subscription information and redirects users
 * to PayPal for subscription management.
 */
export default function SubscriptionManagement() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyReason, setNewKeyReason] = useState('');
  const [newKeyValidity, setNewKeyValidity] = useState<number>(7);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [revokeConfirmDialogOpen, setRevokeConfirmDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<{ id: string; name: string } | null>(null);
  const lastKeyCreationTime = useRef<number>(0);

  // Cancel subscription state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelAtEnd, setCancelAtEnd] = useState(true); // Cancel at end of billing period

  // Load user subscription info and invoices
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          setSubscription({
            plan: user.plan || 'Aarambh',
            status: user.subscriptionStatus || 'active',
            credits: typeof user.credits === 'number' ? user.credits : parseInt(user.credits) || 0,
            nextBillingDate: user.nextBillingDate || user.renewal_date,
            email: user.email,
            subscriptionId: user.subscriptionId || user.subscription_id,
            autoRenew: user.autoRenew !== false,
          });
          setAutoRenew(user.autoRenew !== false);

          // Load invoices
          loadInvoices(user.email);

          // Load API keys
          loadApiKeys(user.email);
        }
      } catch (err) {
        logger.error('Error loading subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  // Load API keys
  const loadApiKeys = async (userId: string) => {
    setApiKeysLoading(true);
    try {
      const response = await AivedhaAPI.listApiKeys(userId);
      if (response.api_keys) {
        setApiKeys(response.api_keys);
      }
    } catch (err) {
      logger.error('Error loading API keys:', err);
    } finally {
      setApiKeysLoading(false);
    }
  };

  // Create new API key
  const handleCreateApiKey = async () => {
    const userEmail = subscription?.email;
    if (!userEmail) {
      toast({
        title: "Error",
        description: "User information not available.",
        variant: "destructive",
      });
      return;
    }

    // Rate limiting check
    const now = Date.now();
    const timeSinceLastCreation = now - lastKeyCreationTime.current;
    if (timeSinceLastCreation < API_KEY_CREATE_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((API_KEY_CREATE_COOLDOWN_MS - timeSinceLastCreation) / 1000);
      toast({
        title: "Please Wait",
        description: `You can create another API key in ${remainingSeconds} seconds.`,
        variant: "destructive",
      });
      return;
    }

    if (!newKeyName.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your API key.",
        variant: "destructive",
      });
      return;
    }

    // Validate max length for name
    if (newKeyName.trim().length > API_KEY_NAME_MAX_LENGTH) {
      toast({
        title: "Name Too Long",
        description: `API key name must be ${API_KEY_NAME_MAX_LENGTH} characters or less.`,
        variant: "destructive",
      });
      return;
    }

    if (!newKeyReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for creating this API key.",
        variant: "destructive",
      });
      return;
    }

    // Validate max length for reason
    if (newKeyReason.trim().length > API_KEY_REASON_MAX_LENGTH) {
      toast({
        title: "Reason Too Long",
        description: `Reason must be ${API_KEY_REASON_MAX_LENGTH} characters or less.`,
        variant: "destructive",
      });
      return;
    }

    setCreatingKey(true);
    try {
      const response = await AivedhaAPI.createApiKey({
        userId: userEmail,
        name: newKeyName.trim(),
        reason: newKeyReason.trim(),
        validityDays: newKeyValidity,
      });

      if (response.success && response.api_key) {
        setNewlyCreatedKey(response.api_key);
        setShowNewKey(true);
        lastKeyCreationTime.current = Date.now();

        // Auto-hide the key after 1 minute for security
        setTimeout(() => {
          setShowNewKey(false);
          setNewlyCreatedKey(null);
        }, SENSITIVE_DATA_DISPLAY_MS);

        // Reload API keys
        loadApiKeys(userEmail);

        toast({
          title: "API Key Created",
          description: "Your new API key has been created. Copy it now - it won't be shown again!",
        });

        // Reset form
        setNewKeyName('');
        setNewKeyReason('');
        setNewKeyValidity(7);
      } else {
        toast({
          title: "Failed to Create Key",
          description: response.error || "Could not create API key. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      logger.error('Error creating API key:', err);
      toast({
        title: "Error",
        description: getErrorMessage(err) || "Failed to create API key.",
        variant: "destructive",
      });
    } finally {
      setCreatingKey(false);
    }
  };

  // Open revoke confirmation dialog
  const openRevokeConfirmDialog = (apiKeyId: string, keyName: string) => {
    setKeyToRevoke({ id: apiKeyId, name: keyName });
    setRevokeConfirmDialogOpen(true);
  };

  // Revoke API key (after confirmation)
  const handleRevokeApiKey = async () => {
    if (!subscription?.email || !keyToRevoke) return;

    setRevokingKeyId(keyToRevoke.id);
    setRevokeConfirmDialogOpen(false);

    try {
      const response = await AivedhaAPI.revokeApiKey(subscription.email, keyToRevoke.id);

      if (response.success) {
        toast({
          title: "API Key Revoked",
          description: "The API key has been revoked and can no longer be used.",
        });

        // Reload API keys
        loadApiKeys(subscription.email);
      } else {
        toast({
          title: "Failed to Revoke",
          description: response.error || "Could not revoke API key.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      logger.error('Error revoking API key:', err);
      toast({
        title: "Error",
        description: getErrorMessage(err) || "Failed to revoke API key.",
        variant: "destructive",
      });
    } finally {
      setRevokingKeyId(null);
      setKeyToRevoke(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied!",
          description: "API key copied to clipboard.",
          duration: COPY_TOAST_DURATION_MS,
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast({
              title: "Copied!",
              description: "API key copied to clipboard.",
              duration: COPY_TOAST_DURATION_MS,
            });
          } else {
            throw new Error('Copy command failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      logger.error('Copy to clipboard failed:', err);
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  // Close new key dialog
  const handleCloseNewKeyDialog = () => {
    setCreateKeyDialogOpen(false);
    setNewlyCreatedKey(null);
    setShowNewKey(false);
  };

  // Load invoices from backend
  const loadInvoices = async (_email: string) => {
    setInvoicesLoading(true);
    try {
      const response = await SubscriptionAPI.getInvoices();
      if (response.invoices) {
        setInvoices(response.invoices.slice(0, 5)); // Show last 5 invoices
      }
    } catch (err) {
      logger.error('Error loading invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Toggle auto-renew
  const handleAutoRenewToggle = async (enabled: boolean) => {
    const subId = subscription?.subscriptionId;
    if (!subId) {
      toast({
        title: "No Active Subscription",
        description: "You need an active subscription to manage auto-renewal.",
        variant: "destructive",
      });
      return;
    }

    setAutoRenewLoading(true);
    try {
      await AivedhaAPI.setAutoRenew(subId, enabled);
      setAutoRenew(enabled);

      // Update localStorage
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.autoRenew = enabled;
        localStorage.setItem('currentUser', JSON.stringify(user));
      }

      toast({
        title: enabled ? "Auto-Renew Enabled" : "Auto-Renew Disabled",
        description: enabled
          ? "Your subscription will automatically renew on the billing date."
          : "Your subscription will expire at the end of the current period.",
      });
    } catch (err: unknown) {
      logger.error('Error toggling auto-renew:', err);
      toast({
        title: "Failed to Update",
        description: getErrorMessage(err) || "Could not update auto-renewal setting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAutoRenewLoading(false);
    }
  };

  // Download invoice PDF
  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: "Download Started",
        description: "Your invoice is being downloaded.",
      });
    } else {
      toast({
        title: "PDF Not Available",
        description: "Invoice PDF is not available for this transaction.",
        variant: "destructive",
      });
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    const subId = subscription?.subscriptionId;
    if (!subId) {
      toast({
        title: "Cannot Cancel",
        description: "No active subscription found to cancel.",
        variant: "destructive",
      });
      return;
    }

    setCancelLoading(true);
    try {
      const result = await AivedhaAPI.cancelSubscription(subId, cancelAtEnd);

      if (result.success) {
        toast({
          title: cancelAtEnd ? "Subscription Will Cancel" : "Subscription Cancelled",
          description: cancelAtEnd
            ? "Your subscription will end at the end of the current billing period. You'll continue to have access until then."
            : "Your subscription has been cancelled immediately.",
        });
        setShowCancelDialog(false);

        // Update local state
        setSubscription(prev => prev ? {
          ...prev,
          status: cancelAtEnd ? 'active' : 'cancelled',
          autoRenew: false,
        } : null);
        setAutoRenew(false);
      } else {
        throw new Error(result.message || 'Failed to cancel subscription');
      }
    } catch (err: unknown) {
      toast({
        title: "Cancellation Failed",
        description: getErrorMessage(err) || "Could not cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // Fetch SSO token from backend
  const fetchSsoToken = useCallback(async () => {
    setPortalLoading(true);
    setSsoError(null);

    try {
      const response = await SubscriptionAPI.getPortalToken();

      if (response.portalUrl) {
        setSsoUrl(response.portalUrl);
        return response.portalUrl;
      } else {
        setSsoError('Unable to generate portal access. You may need to log in manually.');
        return null;
      }
    } catch (error: unknown) {
      logger.error('SSO token error:', error);
      setSsoError(getErrorMessage(error) || 'Failed to get portal access');
      return null;
    } finally {
      setPortalLoading(false);
    }
  }, []);

  // Auto-fetch SSO on mount
  useEffect(() => {
    if (!loading && subscription?.email) {
      fetchSsoToken();
    }
  }, [loading, subscription?.email, fetchSsoToken]);

  // Open portal with SSO (auto-login)
  const handleOpenPortalSSO = async () => {
    setPortalLoading(true);

    let url = ssoUrl;
    if (!url) {
      url = await fetchSsoToken();
    }

    if (url) {
      // Redirect to SSO URL - user will be logged in automatically
      window.location.href = url;
    } else {
      // Fallback to manual portal URL
      toast({
        title: "Auto-login unavailable",
        description: "Opening portal login page. You may need to enter your email.",
        variant: "default",
      });
      window.location.href = 'https://www.paypal.com/myaccount/autopay/';
    }
  };

  // Open portal in new tab with SSO
  const handleOpenPortalNewTab = async () => {
    setPortalLoading(true);

    let url = ssoUrl;
    if (!url) {
      url = await fetchSsoToken();
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast({
        title: "Portal Opened",
        description: "Billing portal opened in new tab with auto-login.",
      });
    } else {
      window.open('https://www.paypal.com/myaccount/autopay/', '_blank', 'noopener,noreferrer');
      toast({
        title: "Portal Opened",
        description: "You may need to log in with your email.",
      });
    }

    setPortalLoading(false);
  };

  // Portal features
  const portalFeatures = [
    {
      icon: Settings,
      title: 'Manage Plan',
      description: 'Upgrade, downgrade, or change your subscription plan',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: CreditCard,
      title: 'Payment Methods',
      description: 'Update credit card, add PayPal, or change billing info',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: FileText,
      title: 'Invoices & Receipts',
      description: 'Download invoices, receipts, and payment history',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      icon: RefreshCw,
      title: 'Cancel or Pause',
      description: 'Cancel subscription or pause billing temporarily',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
  ];

  const getPlanIcon = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'chakra':
      case 'enterprise':
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 'vajra':
        return <Zap className="h-5 w-5 text-purple-500" />;
      case 'suraksha':
        return <Shield className="h-5 w-5 text-blue-500" />;
      default:
        return <Shield className="h-5 w-5 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30"><Clock className="h-3 w-3 mr-1" /> Past Due</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Free'}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-primary">
                  <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">
              Subscription Management
            </h1>
            <p className="text-muted-foreground">
              View your subscription details and manage billing through our secure portal
            </p>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" aria-hidden="true" />
                <p className="text-muted-foreground">Loading subscription details...</p>
              </CardContent>
            </Card>
          )}

          {/* Not Logged In State */}
          {!loading && !subscription && (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Sign In Required</h2>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Please sign in to view and manage your subscription.
                </p>
                <Link to="/login">
                  <button className="px-6 py-2 border-2 border-primary bg-gradient-to-r from-primary to-accent text-white hover:bg-background hover:from-background hover:to-background hover:text-primary hover:border-primary rounded-xl inline-flex items-center transition-all duration-300">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}

          {!loading && subscription && (
            <>
              {/* Current Subscription Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-card/80 backdrop-blur-md border-border/50 mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getPlanIcon(subscription?.plan || '')}
                      Current Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plan</p>
                        <p className="text-xl font-semibold text-foreground">
                          {subscription?.plan || 'Aarambh'} Plan
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <div className="mt-1">
                          {getStatusBadge(subscription?.status || 'free')}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Credits Available</p>
                        <p className="text-xl font-semibold text-foreground">
                          {subscription?.credits ?? 0} Credits
                        </p>
                      </div>
                    </div>
                    {subscription?.nextBillingDate && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline mr-1" aria-hidden="true" />
                          Next billing date: {new Date(subscription.nextBillingDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Auto-Renew Toggle */}
                    {subscription?.subscriptionId && subscription.status === 'active' && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto-renew" className="text-sm font-medium">
                              Auto-Renewal
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {autoRenew
                                ? "Your subscription will automatically renew"
                                : "Your subscription will expire at the end of the billing period"}
                            </p>
                          </div>
                          <Switch
                            id="auto-renew"
                            checked={autoRenew}
                            onCheckedChange={handleAutoRenewToggle}
                            disabled={autoRenewLoading}
                            aria-label="Toggle auto-renewal"
                          />
                        </div>
                        {autoRenewLoading && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Updating...
                          </p>
                        )}

                        {/* Cancel Subscription button */}
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <Button
                            variant="outline"
                            className="w-full text-orange-600 border-orange-500/30 hover:bg-orange-500/10"
                            onClick={() => setShowCancelDialog(true)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Cancel or Pause Subscription
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Invoices Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="bg-card/80 backdrop-blur-md border-border/50 mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-500" />
                      Recent Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoicesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No invoices found</p>
                        <p className="text-xs mt-1">Your invoices will appear here after your first payment</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invoices.map((invoice) => (
                          <div
                            key={invoice.invoiceId}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <FileText className="h-5 w-5 text-purple-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {new Date(invoice.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {invoice.currency} {invoice.amount}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                                className={invoice.status === 'paid' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                              >
                                {invoice.status}
                              </Badge>
                              {invoice.pdfUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadInvoice(invoice)}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* API Keys Section for CI/CD Integration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.17 }}
              >
                <Card className="bg-card/80 backdrop-blur-md border-border/50 mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-lg">API Keys</CardTitle>
                      </div>
                      <Dialog open={createKeyDialogOpen} onOpenChange={setCreateKeyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-black"
                            disabled={subscription?.status !== 'active'}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create API Key
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          {newlyCreatedKey ? (
                            <>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="h-5 w-5" />
                                  API Key Created!
                                </DialogTitle>
                                <DialogDescription>
                                  Copy your API key now. It will not be shown again.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="relative">
                                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                                    {showNewKey ? newlyCreatedKey : '••••••••••••••••••••••••••••'}
                                    <div className="flex items-center gap-1 ml-auto">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowNewKey(!showNewKey)}
                                      >
                                        {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(newlyCreatedKey)}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                  <p className="text-sm text-amber-600 font-medium flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    This key will not be displayed again
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Store it securely. If lost, you'll need to create a new key.
                                  </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                    <Terminal className="h-4 w-4" />
                                    Usage Example
                                  </p>
                                  <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                                    curl -H "X-API-Key: {newlyCreatedKey.substring(0, 20)}..." \<br />
                                    &nbsp;&nbsp;https://api.aivedha.ai/api/cicd/audit
                                  </code>
                                </div>
                              </div>
                              <DialogFooter>
                                <button onClick={handleCloseNewKeyDialog} className="btn-primary px-6 py-2 rounded-xl">Done</button>
                              </DialogFooter>
                            </>
                          ) : (
                            <>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Key className="h-5 w-5 text-amber-500" />
                                  Create API Key
                                </DialogTitle>
                                <DialogDescription>
                                  Generate an API key for CI/CD integration. Keys are limited to audit permissions only.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="key-name">Key Name *</Label>
                                  <Input
                                    id="key-name"
                                    placeholder="e.g., Production CI/CD"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    maxLength={API_KEY_NAME_MAX_LENGTH}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="key-reason">Reason for Creation *</Label>
                                  <Textarea
                                    id="key-reason"
                                    placeholder="e.g., Automated security audits after deployment"
                                    value={newKeyReason}
                                    onChange={(e) => setNewKeyReason(e.target.value)}
                                    rows={2}
                                    maxLength={API_KEY_REASON_MAX_LENGTH}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="key-validity">Validity Period</Label>
                                  <Select
                                    value={newKeyValidity.toString()}
                                    onValueChange={(v) => setNewKeyValidity(parseInt(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {VALIDITY_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value.toString()}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                  <p className="text-sm text-blue-600 font-medium flex items-center gap-1">
                                    <FaGithub className="h-4 w-4" />
                                    GitHub Actions Integration
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Add this API key as a GitHub secret (AIVEDHA_API_KEY) to enable automated security audits in your CI/CD pipeline.
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="px-4 py-2" onClick={() => setCreateKeyDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <button
                                  onClick={handleCreateApiKey}
                                  disabled={creatingKey || !newKeyName.trim() || !newKeyReason.trim()}
                                  className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-lg"
                                >
                                  {creatingKey ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Key className="h-4 w-4 mr-1" />
                                  )}
                                  Create Key
                                </button>
                              </DialogFooter>
                            </>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                    <CardDescription>
                      Secure API keys for CI/CD pipeline integration. Each audit uses 1 credit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subscription?.status !== 'active' && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                        <p className="text-sm text-orange-600 font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Active paid subscription required
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          API key creation is available for users with active paid plans only.
                        </p>
                        <Link to="/pricing">
                          <button className="mt-2 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                            View Plans
                          </button>
                        </Link>
                      </div>
                    )}

                    {apiKeysLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Key className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No API keys created yet</p>
                        <p className="text-xs mt-1">Create an API key to integrate with your CI/CD pipeline</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {apiKeys.map((key) => (
                          <div
                            key={key.api_key_id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                key.status === 'active' ? 'bg-green-500/10' : 'bg-gray-500/10'
                              }`}>
                                <Key className={`h-5 w-5 ${
                                  key.status === 'active' ? 'text-green-500' : 'text-gray-500'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-sm flex items-center gap-2">
                                  {key.name}
                                  <Badge
                                    variant={key.status === 'active' ? 'default' : 'secondary'}
                                    className={key.status === 'active' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                                  >
                                    {key.status}
                                  </Badge>
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {key.key_prefix}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expires: {new Date(key.expires_at).toLocaleDateString()} •
                                  Used: {key.usage_count} times
                                  {key.last_used_at && ` • Last: ${new Date(key.last_used_at).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {key.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRevokeConfirmDialog(key.api_key_id, key.name)}
                                  disabled={revokingKeyId === key.api_key_id}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                >
                                  {revokingKeyId === key.api_key_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* GitHub Action Setup Info */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-start gap-3">
                        <FaGithub className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">GitHub Actions Integration</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add your API key as a secret in your GitHub repository (Settings → Secrets → AIVEDHA_API_KEY),
                            then use our workflow template to run security audits after every deployment.
                          </p>
                          <a
                            href="https://github.com/marketplace/actions/aivedha-security-audit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                          >
                            <Code className="h-3 w-3" />
                            View Workflow Template
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Main Action Card - SSO Portal Access */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 mb-6">
                  <CardContent className="py-8 text-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <LogIn className="h-8 w-8 text-primary" aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Manage Your Subscription
                    </h2>
                    <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                      Access your billing portal with automatic login. No password required.
                    </p>

                    {/* SSO Status */}
                    {ssoUrl && (
                      <p className="text-sm text-green-600 mb-4 flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Auto-login ready
                      </p>
                    )}
                    {ssoError && (
                      <p className="text-sm text-orange-600 mb-4">
                        {ssoError}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={handleOpenPortalSSO}
                        disabled={portalLoading}
                        size="lg"
                        className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-opacity"
                      >
                        {portalLoading ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <LogIn className="w-5 h-5 mr-2" aria-hidden="true" />
                        )}
                        {ssoUrl ? 'Open Billing Portal' : 'Log Into Billing Portal'}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleOpenPortalNewTab}
                        disabled={portalLoading}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                        Open in New Tab
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Secured by AiVedha Billing • 256-bit SSL encryption
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Portal Features Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-lg font-semibold text-foreground mb-4">What you can do in the portal</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {portalFeatures.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                    >
                      <Card
                        className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
                        onClick={handleOpenPortalSSO}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleOpenPortalSSO()}
                        aria-label={`${feature.title}: ${feature.description}`}
                      >
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className={`w-10 h-10 ${feature.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <feature.icon className={`w-5 h-5 ${feature.color}`} aria-hidden="true" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {feature.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                          <LogIn className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Refresh SSO Token */}
              {ssoError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 text-center"
                >
                  <Button
                    variant="ghost"
                    onClick={fetchSsoToken}
                    disabled={portalLoading}
                    className="text-primary"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${portalLoading ? 'animate-spin' : ''}`} />
                    Retry Auto-Login
                  </Button>
                </motion.div>
              )}

              {/* Help Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  Need help with billing?{' '}
                  <a
                    href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
                    className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    Contact our support team
                  </a>
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your {subscription?.plan} subscription?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cancel Options */}
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  cancelAtEnd ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setCancelAtEnd(true)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    cancelAtEnd ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {cancelAtEnd && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-medium">Cancel at end of billing period</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Continue using your subscription until {subscription?.nextBillingDate || 'next billing date'}
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  !cancelAtEnd ? 'border-destructive bg-destructive/5' : 'border-border hover:border-destructive/50'
                }`}
                onClick={() => setCancelAtEnd(false)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    !cancelAtEnd ? 'border-destructive' : 'border-muted-foreground'
                  }`}>
                    {!cancelAtEnd && <div className="w-2 h-2 rounded-full bg-destructive" />}
                  </div>
                  <span className="font-medium text-destructive">Cancel immediately</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Lose access to premium features right away (no refund)
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Your credits will remain available after cancellation but won't renew.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelLoading}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke API Key Confirmation Dialog */}
      <Dialog open={revokeConfirmDialogOpen} onOpenChange={setRevokeConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The API key will be permanently revoked and any applications using it will lose access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to revoke the API key: <span className="font-semibold text-foreground">{keyToRevoke?.name}</span>?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRevokeConfirmDialogOpen(false);
                setKeyToRevoke(null);
              }}
              disabled={revokingKeyId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeApiKey}
              disabled={revokingKeyId !== null}
            >
              {revokingKeyId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
