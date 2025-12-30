import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, CreditCard, LogOut, User, Timer, Sparkles, Settings, HelpCircle, HeadphonesIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { LoginPopup } from "@/components/LoginPopup";

interface NavigationProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

interface UserData {
  email: string;
  fullName?: string;
  name?: string;
  picture?: string;
  credits?: number | string;
  plan?: string;
  identityId?: string;
}

export const Navigation = ({ darkMode, toggleDarkMode }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Use SubscriptionContext for real-time credit sync across all pages
  const { credits: contextCredits, refreshSubscription } = useSubscription();
  const userCredits = contextCredits;

  // Check authentication status
  // Support both email login (authToken) and social login (currentUser only)
  const checkAuthStatus = useCallback(() => {
    const authToken = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');

    // Check if user is logged in - support both email and social login methods
    // Social login (Google/GitHub) may only set currentUser without authToken
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as UserData;
        setIsLoggedIn(true);
        setCurrentUser(user);
        // Credits are now managed by SubscriptionContext - auto-synced
      } catch {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    } else {
      setIsLoggedIn(false);
      setCurrentUser(null);
    }
  }, []);

  // Check login status and load user data on location change
  useEffect(() => {
    setIsMenuOpen(false);
    checkAuthStatus();
  }, [location, checkAuthStatus]);

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('cognitoUser');
    localStorage.removeItem('userSession');
    sessionStorage.clear();

    // Update state
    setIsLoggedIn(false);
    setCurrentUser(null);
    // Credits will auto-clear when SubscriptionContext detects no user

    // Navigate to home - use setTimeout to ensure dropdown closes first
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  // Navigation links - separate for logged in and logged out users
  // Logged in: Only Dashboard, Security Audit, Blogs in top menu
  // Logged out: Pricing, FAQ, Support, Blogs in top menu (no Home - logo handles that)
  const getNavLinks = () => {
    if (isLoggedIn) {
      // For logged-in users: only Dashboard, Security Audit, and Blogs in top nav
      // Pricing, FAQ, Support, Scheduled Audits are in the user dropdown menu
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/security-audit", label: "Security Audit" },
        { href: "/blogs", label: "Blogs" },
      ];
    } else {
      // For logged-out users: show general pages (no Home - logo handles that)
      return [
        { href: "/pricing", label: "Pricing" },
        { href: "/blogs", label: "Blogs" },
        { href: "/faq", label: "FAQ" },
        { href: "/support", label: "Support" },
      ];
    }
  };

  const navLinks = getNavLinks();

  const getUserDisplayName = () => {
    if (!currentUser) return 'User';
    return currentUser.fullName || currentUser.name || currentUser.email?.split('@')[0] || 'User';
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-[40] overflow-hidden nav-glass"
    >
      {/* Matte Surface Overlay - Frosted glass effect - reduced opacity for logo visibility */}
      <div className="absolute inset-0 pointer-events-none nav-matte-overlay" />

      {/* Subtle noise texture for matte feel - reduced for clarity */}
      <div className="absolute inset-0 opacity-[0.008] pointer-events-none nav-noise-texture" />

      {/* 3D Elevated Bottom Edge with Glossy Shine - Curved to match header */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none nav-bottom-edge"
      />
      {/* Secondary glow layer */}
      <div
        className="absolute -bottom-[2px] left-8 right-8 h-[2px] pointer-events-none blur-[2px] nav-secondary-glow"
      />
      {/* Outer glow */}
      <div
        className="absolute -bottom-[4px] left-16 right-16 h-[4px] pointer-events-none blur-[4px] nav-outer-glow"
      />

      {/* Inner highlight at top */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.015] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo with animated shield - Enhanced visibility */}
          <Link to="/" className="flex items-center space-x-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-xl" aria-label="AiVedha Guard - Go to home page">
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Animated glow ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-blue-400 to-cyan-400 opacity-30 blur-md group-hover:opacity-50 transition-opacity duration-500 animate-pulse" />
              {/* Shield container */}
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/40 to-blue-500/40 border border-cyan-300/60 flex items-center justify-center group-hover:border-cyan-200 group-hover:from-cyan-400/50 group-hover:to-blue-400/50 transition-all duration-300 group-hover:scale-105">
                {/* Animated shield icon */}
                <svg
                  className="w-6 h-6 text-white group-hover:text-white transition-colors duration-300 shield-icon-glow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path className="animate-pulse" d="M9 12l2 2 4-4" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col leading-none">
              {/* AiVedha text - Pure white with text shadow for visibility */}
              <span
                className="text-lg font-black tracking-tight text-white group-hover:text-cyan-100 transition-all duration-300 font-orbitron logo-text-glow"
              >
                AiVedha
              </span>
              {/* GUARD text - Bright cyan with glow */}
              <span
                className="text-xs font-bold tracking-widest text-cyan-300 group-hover:text-cyan-100 transition-colors duration-300 font-orbitron logo-guard-glow"
              >
                GUARD
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - White hover with dark border and dark text */}
          <nav className="hidden md:flex items-center space-x-2" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={location.pathname === link.href ? "page" : undefined}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-all duration-300 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  location.pathname === link.href
                    ? "bg-white text-slate-900 border-slate-800 shadow-lg"
                    : "text-white border-transparent hover:bg-white hover:text-slate-900 hover:border-slate-800 hover:shadow-lg"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions - 3-color hover transitions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Credit Display - Only show when logged in */}
            {isLoggedIn && (
              <Link to="/purchase">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-500/20 rounded-xl border-2 border-cyan-400/50 hover:bg-cyan-500 hover:border-cyan-300 hover:text-white transition-all duration-300 cursor-pointer group">
                  <CreditCard className="h-4 w-4 text-cyan-300 group-hover:text-white transition-colors" />
                  <span className="text-sm font-medium text-cyan-200 group-hover:text-white transition-colors">
                    {`${userCredits} Credits`}
                  </span>
                </div>
              </Link>
            )}

{/* Theme Toggle - Hidden icon, functionality kept via keyboard shortcut or other means */}
            {/* Removed: Theme toggle button - use browser/system preferences instead */}

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* User Profile button - 3-color hover: bg, text, border */}
                  <button
                    className="flex items-center space-x-2 px-3 py-2 rounded-md bg-transparent text-white border-2 border-cyan-400/60 hover:bg-cyan-500 hover:text-white hover:border-cyan-300 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    {currentUser?.picture ? (
                      <img
                        src={currentUser.picture}
                        alt="Profile"
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span className="max-w-[100px] truncate">{getUserDisplayName()}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto z-[100]" sideOffset={5}>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/scheduler')}>
                    <Timer className="h-4 w-4 mr-2" />
                    Scheduled Audits
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/purchase')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Buy Credits
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/dashboard/subscription')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/pricing')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Pricing & Addons
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/faq')}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/support')}>
                    <HeadphonesIcon className="h-4 w-4 mr-2" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-red-600 hover:!text-white hover:!bg-red-500 focus:!text-white focus:!bg-red-500"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Creative Portal Entry - Not a button, a unique animated element */
              <div
                onClick={() => setIsLoginPopupOpen(true)}
                className="portal-entry group cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setIsLoginPopupOpen(true)}
              >
                <div className="portal-ring" />
                <div className="portal-core">
                  <span className="portal-text">Kick Off</span>
                  <svg className="portal-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Theme toggle removed - using light theme as default */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white bg-transparent border-2 border-transparent hover:bg-cyan-500 hover:text-white hover:border-cyan-400 transition-all duration-300 rounded-md"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Full Menu Items for Logged-in Users */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 z-[45] py-4 px-4 border-t border-white/20 max-h-[80vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col space-y-3 container mx-auto">
              {/* Mobile Credit Display - Only show when logged in */}
              {isLoggedIn && (
                <Link to="/purchase" onClick={() => setIsMenuOpen(false)} className="w-fit">
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-500/20 rounded-xl border-2 border-cyan-400/50 hover:bg-cyan-500 hover:border-cyan-300 transition-all duration-300 group">
                    <CreditCard className="h-4 w-4 text-cyan-300 group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium text-cyan-200 group-hover:text-white transition-colors">
                      {`${userCredits} Credits`}
                    </span>
                  </div>
                </Link>
              )}

              {/* Primary Navigation Links */}
              <div className="grid grid-cols-2 gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={location.pathname === link.href ? "page" : undefined}
                    className={`text-sm font-medium px-3 py-2.5 rounded-lg transition-all duration-300 border-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                      location.pathname === link.href
                        ? "bg-white text-slate-900 border-slate-800"
                        : "text-white border-white/30 hover:bg-white hover:text-slate-900 hover:border-slate-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* User Menu Items - Only for Logged-in Users */}
              {isLoggedIn && (
                <>
                  <div className="border-t border-white/20 pt-3 mt-2">
                    <p className="text-xs text-slate-400 mb-2 px-1">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/scheduler"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-white border-2 border-white/30 rounded-lg hover:bg-white hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        <Timer className="h-4 w-4" aria-hidden="true" />
                        Scheduled Audits
                      </Link>
                      <Link
                        to="/purchase"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-white border-2 border-white/30 rounded-lg hover:bg-white hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        <CreditCard className="h-4 w-4" aria-hidden="true" />
                        Buy Credits
                      </Link>
                      <Link
                        to="/dashboard/subscription"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-white border-2 border-white/30 rounded-lg hover:bg-white hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Subscription
                      </Link>
                      <Link
                        to="/pricing"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-white border-2 border-white/30 rounded-lg hover:bg-white hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        Pricing
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-3">
                    <p className="text-xs text-slate-400 mb-2 px-1">Help & Support</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/faq"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-white border-2 border-white/30 rounded-lg hover:bg-white hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                        FAQ
                      </Link>
                      <Link
                        to="/support"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-white border-2 border-white/30 rounded-lg hover:bg-white hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        <HeadphonesIcon className="h-4 w-4" aria-hidden="true" />
                        Support
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-3">
                    <div className="text-xs text-slate-400 mb-2 px-1 truncate">
                      {currentUser?.email}
                    </div>
                    <div className="flex gap-2">
                      <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex-1">
                        <Button variant="outline" className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-transparent text-white border-2 border-cyan-400/60 hover:bg-cyan-500 hover:text-white hover:border-cyan-300 transition-all duration-300">
                          <User className="h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <button
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-transparent text-red-400 border-2 border-red-400/60 hover:bg-red-500 hover:text-white hover:border-red-400 transition-all duration-300"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Not Logged In - Show Portal Entry */}
              {!isLoggedIn && (
                <div className="pt-4 flex justify-center">
                  <div
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsLoginPopupOpen(true);
                    }}
                    className="portal-entry group cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsMenuOpen(false);
                        setIsLoginPopupOpen(true);
                      }
                    }}
                  >
                    <div className="portal-ring" />
                    <div className="portal-core">
                      <span className="portal-text">Kick Off</span>
                      <svg className="portal-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>

    {/* Login Popup Modal - OUTSIDE nav to prevent z-index issues */}
    <LoginPopup
      isOpen={isLoginPopupOpen}
      onClose={() => setIsLoginPopupOpen(false)}
    />
    </>
  );
};
