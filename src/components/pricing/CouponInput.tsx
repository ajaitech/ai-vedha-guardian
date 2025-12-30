import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CouponInputProps {
  couponCode: string;
  onApply: (code: string) => Promise<boolean>;
  onClear: () => void;
  error: string | null;
  discount: number;
  loading: boolean;
  discountType?: 'percentage' | 'flat';
  currency?: 'USD'; // USD only globally
}

export function CouponInput({
  couponCode,
  onApply,
  onClear,
  error,
  discount,
  loading,
  discountType = 'percentage',
}: CouponInputProps) {
  const currencySymbol = '$'; // USD only globally
  const [inputValue, setInputValue] = useState('');

  const handleApply = async () => {
    if (!inputValue.trim()) return;
    const success = await onApply(inputValue.trim().toUpperCase());
    if (success) {
      setInputValue('');
    }
  };

  if (discount > 0 && couponCode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 h-10"
      >
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {couponCode}: {discountType === 'percentage' ? `${discount}% OFF` : `${currencySymbol}${discount} OFF`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Remove coupon code"
          className="h-8 w-8 p-0 text-green-600 hover:text-green-800 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 focus-visible:ring-green-500"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter code"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            className="pl-9 h-10 bg-background/50 border-border/50 rounded-lg text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            aria-label="Coupon code"
            aria-describedby={error ? "coupon-error" : undefined}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={loading || !inputValue.trim()}
          className="h-10 px-4 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-sm"
          aria-label={loading ? "Validating coupon" : "Apply coupon code"}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Apply'}
        </Button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id="coupon-error"
            role="alert"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-500 text-xs"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
