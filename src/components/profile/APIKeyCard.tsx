/**
 * API Key Management Card for CI/CD Integration
 *
 * Features:
 * - Create new API keys (max 5 per user)
 * - List existing keys with status
 * - Revoke keys with confirmation
 * - One-time key display with copy functionality
 * - Security warnings and best practices
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Info,
  Eye,
  EyeOff
} from "lucide-react";
import { Link } from "react-router-dom";
import AivedhaAPI from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  CLIPBOARD_FEEDBACK_DURATION_MS,
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_REASON_MAX_LENGTH
} from "@/constants/subscription";

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

interface APIKeyCardProps {
  userId: string;
  isPaidUser?: boolean; // Optional - API keys are FREE for all users
}

const VALIDITY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 15, label: "15 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days (Recommended)" },
];

const MAX_KEYS = 5;

export function APIKeyCard({ userId }: APIKeyCardProps) {
  const { toast } = useToast();

  // State
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyReason, setNewKeyReason] = useState("");
  const [selectedValidity, setSelectedValidity] = useState<number>(90);
  const [creating, setCreating] = useState(false);

  // Created key display
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Revoke dialog
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Fetch keys on mount
  const fetchKeys = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await AivedhaAPI.listApiKeys(userId);

      if (response.success) {
        setKeys(response.api_keys || []);
        setActiveCount(response.active_count || 0);
      } else {
        logger.error("Failed to fetch API keys:", response.error);
      }
    } catch (error) {
      logger.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Create new key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    if (!newKeyReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please enter a reason for creating this key",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await AivedhaAPI.createApiKey({
        userId,
        name: newKeyName.trim(),
        reason: newKeyReason.trim(),
        validityDays: selectedValidity,
      });

      if (response.success && response.api_key) {
        setCreatedKey(response.api_key);
        setShowCreateDialog(false);
        setShowCreatedKey(true);
        setNewKeyName("");
        setNewKeyReason("");
        setSelectedValidity(90);
        fetchKeys();

        toast({
          title: "API Key Created",
          description: "Copy your key now - it will only be shown once!",
        });
      } else {
        toast({
          title: "Failed to create key",
          description: response.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Revoke key
  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    try {
      setRevoking(true);
      const response = await AivedhaAPI.revokeApiKey(userId, keyToRevoke.api_key_id);

      if (response.success) {
        setShowRevokeDialog(false);
        setKeyToRevoke(null);
        fetchKeys();

        toast({
          title: "Key Revoked",
          description: `${keyToRevoke.name} has been revoked`,
        });
      } else {
        toast({
          title: "Failed to revoke",
          description: response.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  // Copy key to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), CLIPBOARD_FEEDBACK_DURATION_MS);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy manually",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (status: ApiKey['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case 'expired':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Revoked</Badge>;
      case 'disabled':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Disabled</Badge>;
      default:
        return null;
    }
  };

  // First-time security warning check
  const handleCreateClick = () => {
    const hasSeenWarning = localStorage.getItem('apikey_security_warning_seen');
    if (!hasSeenWarning) {
      setShowSecurityWarning(true);
    } else {
      setShowCreateDialog(true);
    }
  };

  const acknowledgeSecurityWarning = () => {
    localStorage.setItem('apikey_security_warning_seen', 'true');
    setShowSecurityWarning(false);
    setShowCreateDialog(true);
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Key className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">API Keys</CardTitle>
                <CardDescription>CI/CD Integration Keys</CardDescription>
              </div>
            </div>
            <Button
              onClick={handleCreateClick}
              disabled={activeCount >= MAX_KEYS}
              size="sm"
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Warning Banner */}
          <Alert className="bg-amber-500/5 border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
              API keys grant access to run security audits. Never commit keys to version control.
            </AlertDescription>
          </Alert>

          {/* API Keys are FREE for all users with expiration-based access */}
          <Alert className="bg-emerald-500/5 border-emerald-500/20">
            <Info className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-sm text-emerald-700 dark:text-emerald-400">
              API keys are <strong>FREE</strong> for all users. Each audit via CI/CD uses 1 credit.
            </AlertDescription>
          </Alert>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No API keys yet</p>
              <p className="text-sm">Create a key to integrate with GitHub Actions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.api_key_id}
                  className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        {getStatusBadge(key.status)}
                      </div>
                      <code className="text-xs text-muted-foreground font-mono">
                        {key.key_prefix}...
                      </code>
                    </div>
                    {key.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setKeyToRevoke(key);
                          setShowRevokeDialog(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created: {formatDate(key.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Expires: {formatDate(key.expires_at)}
                    </span>
                    <span>Uses: {key.usage_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key Limit Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
            <span>{activeCount} of {MAX_KEYS} keys used</span>
            <Link
              to="/faq#cicd-integration"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Setup Guide
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Security Warning Dialog (First Time) */}
      <Dialog open={showSecurityWarning} onOpenChange={setShowSecurityWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-amber-500/10">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <DialogTitle>API Key Security Information</DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <p className="font-medium text-foreground">API keys allow external systems to:</p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      Run security audits (1 credit per audit)
                    </li>
                    <li className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      Retrieve audit results
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-foreground">API keys CANNOT:</p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      Access your account settings
                    </li>
                    <li className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      View billing information
                    </li>
                    <li className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      Modify subscriptions
                    </li>
                    <li className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      Access other users' data
                    </li>
                  </ul>
                </div>

                <Alert className="bg-amber-500/5 border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-sm">
                    <strong>Best Practices:</strong>
                    <ul className="mt-1 list-disc list-inside text-xs">
                      <li>Store in GitHub Secrets, not code</li>
                      <li>Use shortest validity period needed</li>
                      <li>Revoke old keys when creating new ones</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={acknowledgeSecurityWarning}>
              I Understand, Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new key for CI/CD integration with GitHub Actions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name *</Label>
              <Input
                id="keyName"
                placeholder="e.g., GitHub Deploy"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={API_KEY_NAME_MAX_LENGTH}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyReason">Reason for Key *</Label>
              <Input
                id="keyReason"
                placeholder="e.g., Post-deployment security scanning"
                value={newKeyReason}
                onChange={(e) => setNewKeyReason(e.target.value)}
                maxLength={API_KEY_REASON_MAX_LENGTH}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity">Validity Period</Label>
              <Select
                value={selectedValidity.toString()}
                onValueChange={(val) => setSelectedValidity(parseInt(val))}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Key Display Dialog */}
      <Dialog open={showCreatedKey} onOpenChange={(open) => {
        if (!open) {
          setCreatedKey(null);
          setCopied(false);
        }
        setShowCreatedKey(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <DialogTitle>API Key Created Successfully</DialogTitle>
            </div>
          </DialogHeader>

          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400 font-medium">
              This key will only be shown once! Copy and save it securely now.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 py-4">
            <Label>Your API Key:</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {createdKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => createdKey && copyToClipboard(createdKey)}
                className={copied ? "text-emerald-600 border-emerald-500" : ""}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Usage:</strong></p>
              <code className="block p-2 bg-muted rounded text-xs">
                X-API-Key: {createdKey?.substring(0, 15)}...
              </code>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCreatedKey(false)}>
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke "{keyToRevoke?.name}"? This action cannot be undone.
              Any integrations using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeKey} disabled={revoking}>
              {revoking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default APIKeyCard;
