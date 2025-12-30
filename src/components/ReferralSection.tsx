/**
 * AiVedha Guardian - Referral Section Component
 * Displays referral code, stats, and share functionality in Dashboard
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ReferralAPI, { ReferralStats, ShareContent } from "@/lib/referral-api";
import { UpgradePlanPopup } from "@/components/UpgradePlanPopup";
import { logger } from "@/lib/logger";
import { CLIPBOARD_FEEDBACK_DURATION_MS } from "@/constants/subscription";
import {
  Gift,
  Copy,
  Share2,
  Users,
  Coins,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Crown,
} from "lucide-react";

interface ReferralSectionProps {
  userEmail: string;
  userName?: string;
}

export function ReferralSection({ userEmail, userName }: ReferralSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [shareContent, setShareContent] = useState<ShareContent | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  const loadReferralData = useCallback(async () => {
    if (!userEmail) return;

    setLoading(true);
    try {
      const data = await ReferralAPI.getStats(userEmail);
      setStats(data);

      // Pre-load share content
      if (data.active_code) {
        const content = await ReferralAPI.getShareContent(data.active_code, userName, userEmail);
        setShareContent(content);
      }
    } catch (error) {
      logger.error('Error loading referral data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load referral data"
      });
    } finally {
      setLoading(false);
    }
  }, [userEmail, userName, toast]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const handleCopyCode = async () => {
    if (!stats?.active_code) return;

    const link = ReferralAPI.getReferralLink(stats.active_code, userEmail);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard"
      });
      setTimeout(() => setCopied(false), CLIPBOARD_FEEDBACK_DURATION_MS);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Unable to copy to clipboard"
      });
    }
  };

  const handleShare = async () => {
    if (!stats?.active_code) return;

    // Check if user is on free plan and has used their unique code
    if (!stats.is_paid_plan && stats.is_common_code_active && !stats.can_earn_bonus) {
      setShowUpgradePopup(true);
      return;
    }

    setSharing(true);
    try {
      const success = await ReferralAPI.shareReferral(stats.active_code, userName, userEmail);
      if (success) {
        toast({
          title: "Shared!",
          description: typeof navigator.share === 'function' ? "Thanks for sharing!" : "Link copied to clipboard"
        });
      }
    } catch {
      // Fallback to copy
      handleCopyCode();
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const referralLink = stats.active_code
    ? ReferralAPI.getReferralLink(stats.active_code, userEmail)
    : '';

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 backdrop-blur-md border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-primary" />
              Refer & Earn
            </CardTitle>
            {stats.is_paid_plan ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Unlimited Bonus
              </Badge>
            ) : stats.can_earn_bonus ? (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Sparkles className="h-3 w-3 mr-1" />
                1 Bonus Available
              </Badge>
            ) : (
              <Badge variant="secondary">
                Bonus Used
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Referral Code Display */}
          <div className="bg-background/50 rounded-xl p-4 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Your Referral Code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-lg font-mono font-bold text-primary bg-primary/10 px-3 py-2 rounded-lg">
                {stats.active_code}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {stats.is_common_code_active && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Community code - {stats.is_paid_plan ? 'Earn 10 credits per referral!' : 'Upgrade to earn bonus'}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 rounded-xl p-3 border border-border/50 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.total_referrals}</p>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
            </div>
            <div className="bg-background/50 rounded-xl p-3 border border-border/50 text-center">
              <Coins className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.total_bonus_earned}</p>
              <p className="text-xs text-muted-foreground">Credits Earned</p>
            </div>
          </div>

          {/* Benefit Info */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl p-3 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Gift className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  Your friends get 10 FREE credits!
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {stats.is_paid_plan
                    ? "You earn 10 credits for every friend who joins!"
                    : stats.can_earn_bonus
                      ? "You'll earn 10 credits when your first friend joins!"
                      : "Upgrade to Raksha plan for unlimited referral bonuses!"}
                </p>
              </div>
            </div>
          </div>

          {/* Share button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex justify-center">
            <Button
              onClick={handleShare}
              disabled={sharing}
              className="bg-gradient-to-r from-primary to-accent text-white font-semibold py-2 px-4 rounded-xl"
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Invite
            </Button>
          </motion.div>

          {/* History Toggle */}
          {stats.history.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-muted-foreground"
              >
                {showHistory ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide History
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    View History ({stats.history.length})
                  </>
                )}
              </Button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-3 max-h-40 overflow-y-auto">
                      {stats.history.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs bg-background/50 rounded-lg p-2"
                        >
                          <span className="truncate max-w-[150px]">{item.used_by}</span>
                          <div className="flex items-center gap-2">
                            {item.bonus_credited && (
                              <Badge variant="secondary" className="text-xs">
                                +10
                              </Badge>
                            )}
                            <span className="text-muted-foreground">
                              {new Date(item.used_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Popup */}
      <UpgradePlanPopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        message="Being on a free plan, you can only earn referral bonus once. Upgrade to Raksha plan for unlimited referral bonuses - earn 10 credits for every friend who joins!"
      />
    </>
  );
}

export default ReferralSection;
