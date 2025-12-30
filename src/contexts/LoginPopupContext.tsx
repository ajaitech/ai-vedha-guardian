/**
 * AiVedha Guard - Global Login Popup Context
 * Provides a way to trigger the login popup from anywhere in the app
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LoginPopup } from '@/components/LoginPopup';

interface LoginPopupContextValue {
  showLoginPopup: (options?: { onSuccess?: () => void; returnTo?: string }) => void;
  hideLoginPopup: () => void;
  isLoginPopupOpen: boolean;
}

const LoginPopupContext = createContext<LoginPopupContextValue | null>(null);

interface LoginPopupProviderProps {
  children: ReactNode;
}

export function LoginPopupProvider({ children }: LoginPopupProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);

  const showLoginPopup = useCallback((options?: { onSuccess?: () => void; returnTo?: string }) => {
    if (options?.onSuccess) {
      setOnSuccessCallback(() => options.onSuccess);
    }
    if (options?.returnTo) {
      sessionStorage.setItem('loginReturnTo', options.returnTo);
    }
    setIsOpen(true);
  }, []);

  const hideLoginPopup = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(null);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsOpen(false);
    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(null);
    }
  }, [onSuccessCallback]);

  return (
    <LoginPopupContext.Provider value={{ showLoginPopup, hideLoginPopup, isLoginPopupOpen: isOpen }}>
      {children}
      <LoginPopup
        isOpen={isOpen}
        onClose={hideLoginPopup}
        onLoginSuccess={handleLoginSuccess}
      />
    </LoginPopupContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLoginPopup() {
  const context = useContext(LoginPopupContext);
  if (!context) {
    throw new Error('useLoginPopup must be used within a LoginPopupProvider');
  }
  return context;
}

export default LoginPopupContext;
