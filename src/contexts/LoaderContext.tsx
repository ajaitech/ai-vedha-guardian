/**
 * Global Loader Context
 * Provides a way to show loading animation from anywhere in the app
 * Renders loader OUTSIDE page flow, similar to LoginPopup pattern
 * Transitions from CircularLoader (instant) to ZooZoo animation (beautiful)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CircularLoader } from '@/components/CircularLoader';
import { ZooZooLoadingAnimation } from '@/components/ZooZooLoadingAnimation';

interface LoaderContextValue {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  isLoading: boolean;
}

const LoaderContext = createContext<LoaderContextValue | null>(null);

interface LoaderProviderProps {
  children: ReactNode;
}

export function LoaderProvider({ children }: LoaderProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('Loading');
  const [showZooZoo, setShowZooZoo] = useState(false);

  const showLoader = useCallback((msg?: string) => {
    setMessage(msg || 'Loading');
    setIsLoading(true);
    setShowZooZoo(false); // Start with circular
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    setShowZooZoo(false);
  }, []);

  // Transition from CircularLoader to ZooZoo after 300ms
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowZooZoo(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      {children}
      {/* Render loader AFTER children, outside page flow - same pattern as LoginPopup */}
      {isLoading && (
        showZooZoo ? (
          <ZooZooLoadingAnimation message={message} />
        ) : (
          <CircularLoader message={message} />
        )
      )}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}

export default LoaderContext;
