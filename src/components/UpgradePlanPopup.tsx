/**
 * AiVedha Guardian - Upgrade Plan Popup
 * Uses usePricing hook to fetch plans from API
 * Supports USD globally via PayPal
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Shield, Loader2, ExternalLink, Gift } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";

interface UpgradePlanPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

// All plans have identical features - only credits differ
const COMMON_FEATURES = [
  'All 21 security scan modules',
  'AI-powered copy-paste fixes',
  'PDF reports with certificate',
  'Referral bonus credits'
];

export function UpgradePlanPopup({ isOpen, onClose, message }: UpgradePlanPopupProps) {
  const navigate = useNavigate();
  const {
    plans,
    formatPrice,
    isLoadingPlans
  } = usePricing();

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter to paid plans only (exclude free Aarambh)
  const paidPlans = plans.filter(p => p.price.monthly > 0);

  // Set default plan when plans load
  useEffect(() => {
    if (paidPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(paidPlans[0].id);
    }
  }, [paidPlans, selectedPlanId]);

  const handleProceed = () => {
    setLoading(true);
    // Navigate to purchase page with selected plan
    navigate(`/purchase?plan=${selectedPlanId}&type=subscription`);
  };

  const selectedPlan = paidPlans.find(p => p.id === selectedPlanId);
  const selectedPrice = selectedPlan ? selectedPlan.price.monthly : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/50">
        <DialogHeader className="text-center space-y-2 pb-3 border-b border-border/30 rounded-b-xl">
          <div className="flex items-center justify-center mb-2">
            <Crown className="h-10 w-10 text-amber-500" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Upgrade Your Plan
          </DialogTitle>
          {message && (
            <DialogDescription className="text-sm text-muted-foreground">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Plan Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select Plan</label>
            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {paidPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        <span className="text-muted-foreground">
                          {formatPrice(plan.price.monthly)}/month
                        </span>
                        {plan.recommended && (
                          <Badge className="bg-primary/20 text-primary text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Plan Details */}
          {selectedPlan && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-foreground">{selectedPlan.name}</h3>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(selectedPrice)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    {selectedPlan.credits} Credits/month
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {COMMON_FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Referral Bonus Highlight */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <Gift className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Earn 10 credits for every friend who joins!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Proceed button */}
          <button
            onClick={handleProceed}
            disabled={loading || !selectedPlanId || isLoadingPlans}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-5 w-5 mr-2" />
            )}
            Proceed to Checkout
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by PayPal
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradePlanPopup;
