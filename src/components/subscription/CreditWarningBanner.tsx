import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Zap, Coins, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreditWarningBannerProps {
  credits: number;
  totalCredits: number;
  planName?: string;
}

export function CreditWarningBanner({ credits, totalCredits, planName }: CreditWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Calculate usage percentage
  const usedPercentage = totalCredits > 0 ? ((totalCredits - credits) / totalCredits) * 100 : 0;

  // No credits to track
  if (totalCredits <= 0) return null;

  // Determine warning level
  const isLowCredits = usedPercentage >= 80 && usedPercentage < 90;
  const isCriticalCredits = usedPercentage >= 90 && credits > 0;
  const isOutOfCredits = credits <= 0;

  if (dismissed || (!isLowCredits && !isCriticalCredits && !isOutOfCredits)) {
    return null;
  }

  const config = isOutOfCredits
    ? {
        bg: 'bg-red-500',
        icon: AlertTriangle,
        message: 'No credits remaining.',
        cta: 'Buy Credits Now',
        href: '/pricing',
        coupon: null,
      }
    : isCriticalCredits
    ? {
        bg: 'bg-orange-500',
        icon: Zap,
        message: `Only ${credits} credit${credits !== 1 ? 's' : ''} left! Use UPGRADE50 for 50% off.`,
        cta: 'Upgrade Now',
        href: '/pricing?coupon=UPGRADE50',
        coupon: 'UPGRADE50',
      }
    : {
        bg: 'bg-yellow-500',
        icon: Coins,
        message: `Running low on credits (${credits} remaining).`,
        cta: 'Upgrade Plan',
        href: '/pricing',
        coupon: null,
      };

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`${config.bg} text-white`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{config.message}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to={config.href}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-lg font-semibold"
              >
                {config.cta}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
