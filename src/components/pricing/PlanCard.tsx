import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, Crown, Zap, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Plan } from '@/constants/plans';
import { cn } from '@/lib/utils';

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Sparkles,
  Shield,
  ShieldCheck,
  Zap,
  Crown,
};

interface PlanCardProps {
  plan: Plan;
  price: number;
  originalPrice?: number;
  formattedPrice: string;
  currency?: 'USD'; // USD only globally
  billingCycle: 'monthly' | 'yearly';
  yearlySavings: number;
  couponDiscount: number;
  formatPrice: (amount: number) => string;
}

export function PlanCard({
  plan,
  price,
  originalPrice,
  formattedPrice,
  currency,
  billingCycle,
  yearlySavings,
  couponDiscount,
  formatPrice,
}: PlanCardProps) {
  const navigate = useNavigate();
  const Icon = PLAN_ICONS[plan.icon] || Shield;
  const hasDiscount = couponDiscount > 0 && originalPrice && originalPrice !== price;

  const handleSelect = () => {
    if (plan.id === 'aarambh') {
      navigate('/signup');
      return;
    }

    if (plan.enterprise) {
      navigate(`/support?subject=Enterprise%20Plan%20Inquiry`);
      return;
    }

    // Navigate to purchase with plan details - USD only globally
    // Plan code format: planId for monthly, planId_yearly for yearly
    const planCode = billingCycle === 'yearly' ? `${plan.id}_yearly` : plan.id;
    navigate(`/purchase?plan=${planCode}&currency=USD&billing=${billingCycle}`);
  };

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full group"
    >
      <Card
        className={cn(
          'relative h-full bg-card/80 backdrop-blur-md border-2 transition-all duration-500',
          // AWS-style glow effect on hover
          'before:absolute before:-inset-[2px] before:rounded-[inherit] before:opacity-0 before:transition-opacity before:duration-500',
          'group-hover:before:opacity-100',
          plan.recommended
            ? 'border-purple-500 shadow-lg shadow-purple-500/20 before:bg-gradient-to-r before:from-purple-500/50 before:via-pink-500/50 before:to-purple-500/50 before:blur-xl group-hover:shadow-2xl group-hover:shadow-purple-500/40'
            : plan.enterprise
            ? 'border-red-500/50 shadow-lg shadow-red-500/20 before:bg-gradient-to-r before:from-red-500/50 before:via-orange-500/50 before:to-red-500/50 before:blur-xl group-hover:shadow-2xl group-hover:shadow-red-500/40'
            : cn(
                'border-border/50',
                'before:bg-gradient-to-r before:from-blue-500/40 before:via-cyan-500/40 before:to-blue-500/40 before:blur-xl',
                'group-hover:border-primary/60 group-hover:shadow-2xl group-hover:shadow-primary/30'
              )
        )}
        style={{
          // Ensure card content is above the glow
          isolation: 'isolate',
        }}
      >
        {/* Badges */}
        {plan.enterprise && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 px-4">
              Enterprise
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pb-4 pt-6 relative z-10">
          {/* Plan Icon */}
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${plan.color}20` }}
          >
            <Icon className="w-7 h-7" style={{ color: plan.color }} />
          </div>

          {/* Plan Name */}
          <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {plan.nameHindi} • {plan.meaning}
          </p>
          <CardDescription className="mt-2">{plan.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          {/* Price */}
          <div className="text-center">
            {hasDiscount && (
              <p className="text-sm text-muted-foreground line-through mb-1">
                {formatPrice(originalPrice)}
              </p>
            )}
            <div className="flex items-baseline justify-center gap-1">
              <span
                className={cn(
                  'text-4xl font-bold',
                  plan.recommended
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent'
                    : 'text-foreground'
                )}
              >
                {plan.id === 'aarambh' ? 'FREE' : formattedPrice}
              </span>
              {plan.id !== 'aarambh' && (
                <span className="text-muted-foreground text-sm">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              )}
            </div>

            {billingCycle === 'yearly' && yearlySavings > 0 && (
              <p className="text-sm text-green-500 mt-1">
                Save {formatPrice(yearlySavings)}/year
              </p>
            )}

            {couponDiscount > 0 && plan.id !== 'aarambh' && (
              <p className="text-sm text-orange-500 mt-1">{couponDiscount}% discount applied</p>
            )}
          </div>

          {/* Credits */}
          <div className="bg-muted/50 dark:bg-muted/30 rounded-xl p-4 text-center">
            <span className="text-3xl font-bold dynamic-color" style={{ '--dynamic-color': plan.color } as React.CSSProperties}>
              {plan.credits}
            </span>
            <span className="text-muted-foreground ml-2">
              {plan.id === 'aarambh' ? 'one-time credits' : 'credits/month'}
            </span>
            {plan.id !== 'aarambh' && (
              <p className="text-xs text-muted-foreground mt-1">
                ${plan.pricePerCredit.toFixed(2)} per audit
              </p>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-2.5">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Check
                  className="w-4 h-4 mt-0.5 flex-shrink-0 dynamic-color"
                  style={{ '--dynamic-color': plan.color } as React.CSSProperties}
                />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA button with plan-specific effects */}
          <button
            onClick={handleSelect}
            className={cn(
              'w-full py-6 rounded-xl font-semibold transition-all duration-300',
              plan.recommended
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40'
                : plan.enterprise
                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40'
                : plan.id === 'aarambh'
                ? 'bg-muted hover:bg-muted/80 text-foreground'
                : plan.id === 'raksha'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-2 border-transparent hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.5),0_0_40px_rgba(6,182,212,0.3)]'
                : plan.id === 'vajra'
                ? 'btn-thunder'
                : plan.id === 'chakra'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white border-2 border-transparent hover:border-pink-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.5),0_0_40px_rgba(236,72,153,0.3)]'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
          >
            {plan.id === 'aarambh'
              ? 'Start Free'
              : plan.enterprise
              ? 'Contact Sales'
              : plan.id === 'vajra'
              ? 'Get Vajra'
              : 'Get Started'}
          </button>

          {/* Target User */}
          <p className="text-xs text-center text-muted-foreground">
            Best for {plan.targetUser}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
