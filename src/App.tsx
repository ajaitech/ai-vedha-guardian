import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SessionProvider, useSession } from "@/contexts/SessionContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LoginPopupProvider, useLoginPopup } from "@/contexts/LoginPopupContext";
import { LoaderProvider } from "@/contexts/LoaderContext";
import { ScrollToTop } from "./components/ScrollToTop";

// Critical path components - load synchronously for initial render
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ZooZooLoader } from "./components/ZooZooLoader";
import { CircularLoader } from "./components/CircularLoader";
import { Layout } from "./components/Layout";

// Lazy load all other pages for code splitting (reduces initial bundle ~70%)
// Signup removed - only social login (Google/GitHub) allowed
// const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SecurityAudit = lazy(() => import("./pages/SecurityAudit"));
const AuditResults = lazy(() => import("./pages/AuditResults"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Purchase = lazy(() => import("./pages/Purchase"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Support = lazy(() => import("./pages/Support"));
const Certificate = lazy(() => import("./pages/Certificate"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const Profile = lazy(() => import("./pages/Profile"));
const GitHubCallback = lazy(() => import("./pages/GitHubCallback"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));
const SubscriptionConfirmPage = lazy(() => import("./pages/SubscriptionConfirmPage"));
const SubscriptionManagement = lazy(() => import("./pages/dashboard/SubscriptionManagement"));
const TransactionHistory = lazy(() => import("./pages/dashboard/TransactionHistory"));
const SchedulerPage = lazy(() => import("./pages/SchedulerPage"));
const Blogs = lazy(() => import("./pages/Blogs"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Verify = lazy(() => import("./pages/Verify"));
const Referral = lazy(() => import("./pages/Referral"));
const SecurityModules = lazy(() => import("./pages/SecurityModules"));
const Startup = lazy(() => import("./pages/Startup"));

// Admin pages - lazy load as they're rarely accessed
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const PaymentAnalytics = lazy(() => import("./pages/admin/PaymentAnalytics"));
const EmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const ReceiptManagement = lazy(() => import("./pages/admin/ReceiptManagement"));
const EmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const BillingManagement = lazy(() => import("./pages/admin/BillingManagement"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Documentation = lazy(() => import("./pages/admin/Documentation"));

const queryClient = new QueryClient();

// Loading component for Suspense fallback - Lightweight circular loader shows instantly
// CircularLoader is independent and appears immediately while page chunks load
const PageLoader = () => (
  <>
    <CircularLoader message="Loading" />
    <Layout>
      <div className="min-h-[60vh]" />
    </Layout>
  </>
);


// Login Route Handler - Shows popup instead of page
const LoginRouteHandler = () => {
  const { showLoginPopup } = useLoginPopup();
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Already logged in, redirect to dashboard
      navigate('/dashboard', { replace: true });
    } else {
      // Show popup and redirect to home
      const returnTo = (location.state as { from?: string } | null)?.from || '/dashboard';
      showLoginPopup({
        onSuccess: () => navigate(returnTo, { replace: true }),
        returnTo
      });
      // Navigate to home page with popup overlay
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, showLoginPopup, location]);

  return (
    <>
      <CircularLoader message="Signing In" />
      <Layout>
        <div className="min-h-[60vh]" />
      </Layout>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SessionProvider>
        <CurrencyProvider>
        <SubscriptionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LoaderProvider>
            <LoginPopupProvider>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Critical path routes - no lazy loading */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginRouteHandler />} />

                {/* Auth routes - Only social login allowed (Google/GitHub) */}
                <Route path="/signup" element={<LoginRouteHandler />} />
                <Route path="/auth/github/callback" element={<GitHubCallback />} />

                {/* Main app routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/security-audit" element={<SecurityAudit />} />
                <Route path="/security-modules" element={<SecurityModules />} />
                <Route path="/audit-results" element={<AuditResults />} />
                <Route path="/audit/results/:reportId" element={<AuditResults />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/purchase" element={<Purchase />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/blogs" element={<Blogs />} />
                <Route path="/blogs/:slug" element={<BlogPost />} />
                <Route path="/support" element={<Support />} />
                <Route path="/account-deletion" element={<AccountDeletion />} />
                <Route path="/certificate/:certificateNumber" element={<Certificate />} />
                <Route path="/verify/:certificateNumber" element={<Verify />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/referral" element={<Referral />} />
                <Route path="/refer" element={<Navigate to="/referral" replace />} />
                <Route path="/invite" element={<Navigate to="/referral" replace />} />

                {/* Startup Program - Direct URL only, not in menu */}
                <Route path="/startup" element={<Startup />} />
                <Route path="/startup-offers" element={<Navigate to="/startup" replace />} />
                <Route path="/startup-schemes" element={<Navigate to="/startup" replace />} />
                <Route path="/startup-security" element={<Navigate to="/startup" replace />} />

                {/* Payment routes */}
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/subscription-success" element={<PaymentSuccess />} />
                <Route path="/subscription/success" element={<PaymentSuccess />} />
                <Route path="/subscription/confirm" element={<SubscriptionConfirmPage />} />
                <Route path="/checkout/success" element={<PaymentSuccess />} />
                <Route path="/checkout-success" element={<PaymentSuccess />} />
                <Route path="/confirm" element={<SubscriptionConfirmPage />} />
                <Route path="/success" element={<PaymentSuccess />} />
                <Route path="/payment/confirm" element={<SubscriptionConfirmPage />} />
                <Route path="/payment-confirm" element={<SubscriptionConfirmPage />} />
                <Route path="/payment/failed" element={<PaymentFailed />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                <Route path="/checkout/failed" element={<PaymentFailed />} />
                <Route path="/payment/cancel" element={<PaymentFailed />} />
                <Route path="/payment-cancel" element={<PaymentFailed />} />
                <Route path="/checkout/cancel" element={<PaymentFailed />} />
                <Route path="/subscription/cancel" element={<Navigate to="/pricing?cancelled=true" replace />} />

                {/* Subscription Management Routes */}
                <Route path="/dashboard/subscription" element={<SubscriptionManagement />} />
                <Route path="/dashboard/subscription/confirm" element={<SubscriptionConfirmPage />} />
                <Route path="/dashboard/transactions" element={<TransactionHistory />} />
                <Route path="/transactions" element={<Navigate to="/dashboard/transactions" replace />} />
                <Route path="/payment-history" element={<Navigate to="/dashboard/transactions" replace />} />
                <Route path="/billing-history" element={<Navigate to="/dashboard/transactions" replace />} />
                <Route path="/scheduler" element={<SchedulerPage />} />
                <Route path="/scheduled-audits" element={<SchedulerPage />} />
                {/* Redirect old subscription routes to unified management */}
                <Route path="/subscription" element={<Navigate to="/dashboard/subscription" replace />} />
                <Route path="/manage-subscription" element={<Navigate to="/dashboard/subscription" replace />} />
                <Route path="/dashboard/subscription/portal" element={<Navigate to="/dashboard/subscription" replace />} />

                {/* SEO-friendly redirects */}
                <Route path="/audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/help" element={<Navigate to="/faq" replace />} />
                <Route path="/contact" element={<Navigate to="/support" replace />} />
                <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
                <Route path="/website-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/vulnerability-scanner" element={<Navigate to="/security-audit" replace />} />
                <Route path="/penetration-testing" element={<Navigate to="/security-audit" replace />} />
                <Route path="/owasp-compliance" element={<Navigate to="/security-audit" replace />} />
                <Route path="/ssl-certificate-checker" element={<Navigate to="/security-audit" replace />} />
                <Route path="/xss-vulnerability-scanner" element={<Navigate to="/security-audit" replace />} />
                <Route path="/sql-injection-scanner" element={<Navigate to="/security-audit" replace />} />
                <Route path="/security-headers-checker" element={<Navigate to="/security-audit" replace />} />
                <Route path="/malware-scanner" element={<Navigate to="/security-audit" replace />} />
                <Route path="/api-security-testing" element={<Navigate to="/security-audit" replace />} />
                <Route path="/cybersecurity-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/ai-security-scanner" element={<Navigate to="/security-audit" replace />} />
                <Route path="/free-security-scan" element={<Navigate to="/security-audit" replace />} />
                <Route path="/web-application-security" element={<Navigate to="/security-audit" replace />} />
                <Route path="/automated-security-testing" element={<Navigate to="/security-audit" replace />} />
                <Route path="/security-assessment" element={<Navigate to="/security-audit" replace />} />
                <Route path="/enterprise-security" element={<Navigate to="/security-audit" replace />} />
                <Route path="/features" element={<Navigate to="/security-modules" replace />} />
                <Route path="/security-features" element={<Navigate to="/security-modules" replace />} />
                <Route path="/what-we-scan" element={<Navigate to="/security-modules" replace />} />
                <Route path="/modules" element={<Navigate to="/security-modules" replace />} />

                {/* Extended SEO Redirects - Competitors & Government */}
                <Route path="/deloitte-competitor-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/better-than-deloitte-security" element={<Navigate to="/security-audit" replace />} />
                <Route path="/ey-competitor-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/better-than-ey-security" element={<Navigate to="/security-audit" replace />} />
                <Route path="/tamil-nadu-government-approved" element={<Navigate to="/security-audit" replace />} />
                <Route path="/tnau-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/startup-tn-approved" element={<Navigate to="/startup" replace />} />
                <Route path="/gem-approved-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/msme-security-audit" element={<Navigate to="/startup" replace />} />
                <Route path="/sidbi-approved-audit" element={<Navigate to="/startup" replace />} />
                <Route path="/iso-27001-security-audit" element={<Navigate to="/security-modules" replace />} />
                <Route path="/european-union-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/world-bank-security-audit" element={<Navigate to="/security-audit" replace />} />

                {/* SEO Redirects - Global Locations */}
                <Route path="/germany-best-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/india-top-ai-company" element={<Navigate to="/" replace />} />
                <Route path="/london-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/new-york-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/singapore-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/australia-sydney-security" element={<Navigate to="/security-audit" replace />} />
                <Route path="/japan-security-audit" element={<Navigate to="/security-audit" replace />} />

                {/* SEO Redirects - Features & Benefits */}
                <Route path="/automatic-audits" element={<Navigate to="/security-modules" replace />} />
                <Route path="/low-cost-audit" element={<Navigate to="/pricing" replace />} />
                <Route path="/worlds-best-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/trusted-audit-platform" element={<Navigate to="/" replace />} />
                <Route path="/ai-powered-analysis" element={<Navigate to="/security-modules" replace />} />
                <Route path="/free-vulnerability-scan" element={<Navigate to="/security-audit" replace />} />
                <Route path="/website-vulnerability-check" element={<Navigate to="/security-audit" replace />} />

                {/* SEO Redirects - Industry Specific */}
                <Route path="/fintech-approved-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/healthcare-security" element={<Navigate to="/security-audit" replace />} />
                <Route path="/banking-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/ecommerce-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/shipping-security-audit" element={<Navigate to="/security-audit" replace />} />
                <Route path="/insurance-company-audit" element={<Navigate to="/security-audit" replace />} />

                {/* Catch-all SEO pattern - any unmatched SEO path goes to security-audit */}
                <Route path="/security-audit-/*" element={<Navigate to="/security-audit" replace />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="payments" element={<PaymentAnalytics />} />
                  <Route path="email-templates" element={<EmailTemplates />} />
                  <Route path="receipts" element={<ReceiptManagement />} />
                  <Route path="email-settings" element={<EmailSettings />} />
                  <Route path="support-tickets" element={<SupportTickets />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route path="billing" element={<BillingManagement />} />
                  <Route path="docs" element={<Documentation />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </LoginPopupProvider>
            </LoaderProvider>
          </BrowserRouter>
        </SubscriptionProvider>
        </CurrencyProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
