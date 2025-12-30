/**
 * AiVedha Guard - Currency Display
 * USD Only - PayPal handles local payment methods globally
 */

import React from 'react';
import { Globe } from 'lucide-react';

interface CurrencyToggleProps {
  className?: string;
}

export function CurrencyToggle({ className = '' }: CurrencyToggleProps) {
  // Display USD as the global currency
  // PayPal handles local payment methods automatically
  return (
    <div className={`inline-flex items-center bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl px-4 py-2 ${className}`}>
      <Globe className="w-4 h-4 text-blue-500 mr-2" />
      <span className="text-sm font-medium text-foreground">USD</span>
      <span className="text-xs text-muted-foreground ml-2">Global</span>
    </div>
  );
}

export default CurrencyToggle;
