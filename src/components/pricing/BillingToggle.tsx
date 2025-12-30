import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface BillingToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
  savingsText?: string;
}

export function BillingToggle({ billingCycle, onChange, savingsText = '✨ Smart Choice - Save 10%' }: BillingToggleProps) {
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div
        role="group"
        aria-label="Billing cycle selection"
        className="inline-flex items-center bg-muted/50 dark:bg-muted/30 rounded-xl p-1.5 border border-border/50"
      >
        <button
          type="button"
          onClick={() => onChange('monthly')}
          aria-pressed={billingCycle === 'monthly'}
          aria-label="Monthly billing"
          className={cn(
            'relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            billingCycle === 'monthly'
              ? 'text-white'
              : 'text-muted-foreground'
          )}
        >
          {billingCycle === 'monthly' && (
            <motion.div
              layoutId="billing-bg"
              className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-lg"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative">Monthly</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('yearly')}
          aria-pressed={billingCycle === 'yearly'}
          aria-label="Yearly billing - recommended for savings"
          className={cn(
            'relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            billingCycle === 'yearly'
              ? 'text-white'
              : 'text-muted-foreground'
          )}
        >
          {billingCycle === 'yearly' && (
            <motion.div
              layoutId="billing-bg"
              className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative">Yearly</span>
        </button>
      </div>
      {/* Smart Savings Badge - Always visible, no hover effects */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
      >
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {billingCycle === 'yearly' ? savingsText : '💡 Go Yearly & Save 10%'}
        </span>
      </motion.div>
    </div>
  );
}
