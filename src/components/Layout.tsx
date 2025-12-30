import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { SessionWarningBanner } from "@/components/SessionWarningBanner";

interface LayoutProps {
  children: React.ReactNode;
}

// Theme storage key
const THEME_STORAGE_KEY = 'aivedha-theme';

export const Layout = ({ children }: LayoutProps) => {
  // Initialize dark mode: check localStorage first, default to light mode for first-time users
  const [darkMode, setDarkMode] = useState(() => {
    // Check if theme is saved in localStorage
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme !== null) {
      return savedTheme === 'dark';
    }
    // Default to light mode for first-time users
    return false;
  });

  useEffect(() => {
    // Apply theme to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save theme preference to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed Header */}
      <Navigation darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      {/* Main Content - grows to fill space, pushes footer down */}
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* Footer - stays at bottom, visible only by scrolling */}
      <Footer />

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* Session Warning Banner */}
      <SessionWarningBanner />
    </div>
  );
};