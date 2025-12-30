/**
 * AiVedha Guard - Currency Context
 * USD Only - Global Currency for all countries
 * PayPal handles local payment methods automatically
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react';

// Single currency type - USD only globally
export type Currency = 'USD';

interface CurrencyContextType {
  currency: Currency;
  currencySymbol: string;
  formatPrice: (amount: number | null | undefined) => string;
  // Legacy compatibility - returns USD value from object
  formatPriceFromObject: (priceObj: { USD: number } | number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Always USD - PayPal handles local payment methods per country
  const currency: Currency = 'USD';
  const currencySymbol = '$';

  // Format a price amount in USD
  const formatPrice = useCallback((amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0';
    }
    const safeAmount = amount < 0 ? 0 : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: safeAmount < 1 ? 2 : 0,
    }).format(safeAmount);
  }, []);

  // Format price from object (legacy compatibility)
  const formatPriceFromObject = useCallback((priceObj: { USD: number } | number | null | undefined): string => {
    if (priceObj === null || priceObj === undefined) {
      return '$0';
    }
    if (typeof priceObj === 'number') {
      return formatPrice(priceObj);
    }
    return formatPrice(priceObj.USD);
  }, [formatPrice]);

  const value = useMemo(() => ({
    currency,
    currencySymbol,
    formatPrice,
    formatPriceFromObject,
  }), [formatPrice, formatPriceFromObject]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Static price data - USD only
// eslint-disable-next-line react-refresh/only-export-components
export const PRICE_DATA = {
  perAudit: 1,
  aarambh: 10,
  raksha: 25,
  suraksha: 50,
  vajra: 150,
  chakra: 300,
  whiteLabel: 60,
  scheduler: 25,
  apiAccess: 40,
};
