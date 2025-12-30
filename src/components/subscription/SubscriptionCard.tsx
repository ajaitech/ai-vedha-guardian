import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  CreditCard,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Coins,
  Zap,
  Crown,
  ShieldCheck,
  Sparkles,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getPlanById, type Plan } from '@/constants/plans';
import { cn } from '@/lib/utils';

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Shield,
  ShieldCheck,
  Zap,
  Crown,
};

interface SubscriptionCardProps {
  currentPlan: string | null;
  planName: string | null;
  credits: number;
  totalCredits: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  loading?: boolean;
}

export function SubscriptionCard({
  currentPlan,
  planName,
  credits,
  totalCredits,
  subscriptionStatus,
  currentPeriodEnd,
  loading = false,
}: SubscriptionCardProps) {
  // Get plan details
  const plan = currentPlan ? getPlanById(currentPlan.replace(/_monthly|_yearly|_usd/g, '')) : null;
  const Icon = plan ? PLAN_ICONS[plan.icon] || Shield : Shield;

  // Calculate credit usage
  const creditPercentage = totalCredits > 0 ? (credits / totalCredits) * 100 : 0;
  const usedPercentage = 100 - creditPercentage;

  // Warning states
  const isLowCredits = usedPercentage >= 80 && usedPercentage < 90;
  const isCriticalCredits = usedPercentage >= 90 && credits > 0;
  const isOutOfCredits = credits <= 0;

  // Status colors
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    cancelled: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    expired: 'bg-red-500/10 text-red-600 border-red-500/20',
    trial: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    free: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  // Progress color
  const progressColor = isOutOfCredits
    ? 'bg-red-500'
    : isCriticalCredits
    ? 'bg-orange-500'
    : isLowCredits
    ? 'bg-yellow-500'
    : 'bg-green-500';

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-muted rounded w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border/50 overflow-hidden">
      {/* Header with gradient */}
      <div
        className="p-6 relative plan-header-gradient"
        style={{ '--header-gradient': plan ? `linear-gradient(135deg, ${plan.color}15, ${plan.color}05)` : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.03))' } as React.CSSProperties}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center plan-icon-bg"
              style={{ '--icon-bg': plan ? `${plan.color}20` : 'rgba(59, 130, 246, 0.2)' } as React.CSSProperties}
            >
              <Icon className="w-6 h-6 dynamic-color" style={{ '--dynamic-color': plan?.color || '#3B82F6' } as React.CSSProperties} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {planName || plan?.name || 'No Plan'}
                {plan && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({plan.nameHindi})
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {plan?.meaning || 'Select a plan to start auditing'}
              </p>
            </div>
          </div>
          {subscriptionStatus && (
            <Badge className={cn('border', statusColors[subscriptionStatus] || statusColors.free)}>
              {subscriptionStatus === 'free' ? 'Free Plan' : subscriptionStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Credit Usage */}
      <CardContent className="pt-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Credits Available</span>
            <span className="font-semibold text-foreground">
              {`${credits} / ${totalCredits}`}
            </span>
          </div>

          {totalCredits > 0 && (
            <>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${creditPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', progressColor)}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {isOutOfCredits ? 'Out of credits' : `${Math.round(usedPercentage)}% used`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {credits} remaining
                </span>
              </div>
            </>
          )}
        </div>

        {/* Warning Banners */}
        {(isLowCredits || isCriticalCredits || isOutOfCredits) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-2 p-3 rounded-xl',
              isOutOfCredits
                ? 'bg-red-500/10 text-red-600'
                : isCriticalCredits
                ? 'bg-orange-500/10 text-orange-600'
                : 'bg-yellow-500/10 text-yellow-600'
            )}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">
              {isOutOfCredits
                ? 'No credits remaining. Upgrade or buy more to continue auditing.'
                : isCriticalCredits
                ? 'Almost out of credits! Upgrade now with UPGRADE50 for 50% off.'
                : 'Running low on credits. Consider upgrading your plan.'}
            </span>
          </motion.div>
        )}

        {/* Subscription Details */}
        {(currentPeriodEnd || currentPlan) && (
          <div className="grid grid-cols-2 gap-4">
            {currentPeriodEnd && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Next Billing</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(currentPeriodEnd).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
            {currentPlan && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Billing</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {currentPlan.includes('yearly') ? 'Yearly' : 'Monthly'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to="/pricing" className="flex-1">
            <button className="rounded-xl border-2 border-primary bg-gradient-to-r from-primary to-accent text-white hover:bg-background hover:from-background hover:to-background hover:text-primary hover:border-primary transition-all duration-300">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              {subscriptionStatus === 'free' || !subscriptionStatus ? 'Get Started' : 'Upgrade Plan'}
            </button>
          </Link>
          <Link to="/pricing#credit-packs" className="flex-1">
            <button className="btn-secondary rounded-xl px-4 py-2">
              <Coins className="w-4 h-4 mr-2" />
              Buy Credits
            </button>
          </Link>
          {subscriptionStatus && subscriptionStatus !== 'free' && (
            <Link to="/profile">
              <button className="btn-ghost rounded-xl p-2">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
