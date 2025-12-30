import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Tag,
  Coins,
  Shield,
  ShieldCheck,
  Zap,
  Building2,
  Sparkles,
  Calendar,
  Award,
  Key,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Plan } from "@/constants/plans";
import type { Addon } from "@/constants/addons";
import { RECURRING_ADDONS } from "@/constants/addons";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Sparkles,
  Shield,
  ShieldCheck,
  Zap,
  Building2,
  Coins,
  Calendar,
  Award,
  Key,
};

export interface OrderItem {
  type: "plan" | "addon" | "credits";
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  icon?: string;
  billingCycle?: "monthly" | "yearly";
  credits?: number;
}

export interface CouponInfo {
  code: string;
  discountPercent: number;
  discountAmount: number;
  type: "percent" | "fixed";
}

export interface OrderSummaryProps {
  plan?: Plan | null;
  addons?: string[];
  creditPack?: Addon | null;
  billingCycle: "monthly" | "yearly";
  coupon?: CouponInfo | null;
  currency?: string;
  onRemoveAddon?: (addonId: string) => void;
  onRemovePlan?: () => void;
  onRemoveCreditPack?: () => void;
  onRemoveCoupon?: () => void;
  className?: string;
  collapsible?: boolean;
  showRemovebuttons?: boolean;
  formatPrice?: (price: number) => string;
  getAddonPrice?: (addon: Addon) => number;
}

export function OrderSummary({
  plan,
  addons = [],
  creditPack,
  billingCycle,
  coupon,
  currency = "USD",
  onRemoveAddon,
  onRemovePlan,
  onRemoveCreditPack,
  onRemoveCoupon,
  className = "",
  collapsible = false,
  showRemovebuttons = true,
  formatPrice = (price: number) => `$${price.toFixed(2)}`,
  getAddonPrice,
}: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate subtotal
  const getPlanPrice = () => {
    if (!plan) return 0;
    return billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly;
  };

  const getCreditPackPrice = () => {
    if (!creditPack) return 0;
    return creditPack.price;
  };

  // Get addon price dynamically from constants - single source of truth
  const getAddonPriceByName = (addonName: string): number => {
    // Look up in RECURRING_ADDONS from constants
    const addon = RECURRING_ADDONS.find(a => a.name === addonName);
    if (addon) return addon.price;

    // Fallback for any legacy names that might exist
    const legacyPrices: Record<string, number> = {
      "White Label Certificate": 60, // Legacy name
    };
    return legacyPrices[addonName] || 0;
  };

  const getAddonsTotal = () => {
    return addons.reduce((total, addonName) => {
      return total + getAddonPriceByName(addonName);
    }, 0);
  };

  const subtotal = getPlanPrice() + getCreditPackPrice() + getAddonsTotal();

  // Calculate discount
  const discountAmount = coupon?.discountAmount || 0;

  // Final total
  const total = Math.max(0, subtotal - discountAmount);

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Shield;
    return IconComponent;
  };

  // Check if cart is empty
  const isEmpty = !plan && !creditPack && addons.length === 0;

  if (isEmpty) {
    return (
      <Card className={`bg-card/80 backdrop-blur-md border-2 border-border/50 ${className}`}>
        <CardContent className="py-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Select a plan or credit pack to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card/80 backdrop-blur-md border-2 border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Order Summary
          </CardTitle>
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={collapsible ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: "auto" }}
            exit={collapsible ? { opacity: 0, height: 0 } : undefined}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-4">
              {/* Plan Item */}
              {plan && (
                <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      {(() => {
                        const Icon = getIcon(plan.icon);
                        return <Icon className="h-5 w-5 text-primary" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({plan.nameHindi})
                        </span>
                        {plan.recommended && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {plan.credits} credits/
                        {billingCycle === "yearly" ? "year" : "month"}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {billingCycle === "yearly" ? "Annual" : "Monthly"} billing
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">
                      {formatPrice(getPlanPrice())}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{billingCycle === "yearly" ? "yr" : "mo"}
                    </span>
                    {showRemovebuttons && onRemovePlan && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemovePlan}
                        className="h-6 w-6 p-0 ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Credit Pack Item */}
              {creditPack && (
                <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Coins className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{creditPack.name}</span>
                        {creditPack.popular && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {creditPack.description}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        One-time purchase
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">
                      {formatPrice(getCreditPackPrice())}
                    </span>
                    {showRemovebuttons && onRemoveCreditPack && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemoveCreditPack}
                        className="h-6 w-6 p-0 ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Addon Items */}
              {addons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Add-ons</p>
                  {addons.map((addonName, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-blue-500/20">
                          {addonName.includes("White") || addonName.includes("Label") ? (
                            <Award className="h-4 w-4 text-blue-500" />
                          ) : addonName.includes("Scheduled") || addonName.includes("Audit") ? (
                            <Calendar className="h-4 w-4 text-blue-500" />
                          ) : addonName.includes("API") ? (
                            <Key className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Zap className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <span className="text-sm">{addonName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatPrice(getAddonPriceByName(addonName))}/mo
                        </span>
                        {showRemovebuttons && onRemoveAddon && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveAddon(addonName)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-3" />

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {/* Coupon Discount */}
                {coupon && discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-500">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" />
                      <span>Discount ({coupon.code})</span>
                      {showRemovebuttons && onRemoveCoupon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRemoveCoupon}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <Separator className="my-2" />

                {/* Total */}
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <div className="text-right">
                    <span className="text-primary">{formatPrice(total)}</span>
                    {(plan || addons.length > 0) && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Savings indicator for yearly */}
                {billingCycle === "yearly" && plan && (
                  <div className="flex items-center justify-end gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" />
                    <span>
                      Save {formatPrice(plan.price.monthly * 12 - plan.price.yearly)} with annual billing
                    </span>
                  </div>
                )}
              </div>

              {/* Currency Note */}
              <div className="text-xs text-muted-foreground text-center pt-2">
                All prices in {currency}. Secure payment via PayPal.
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default OrderSummary;
